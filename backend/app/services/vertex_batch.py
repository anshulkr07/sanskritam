"""Vertex AI batch jobs for the word journey pipeline (handover_language 7.2).

Proven 2026-10-02 (run): three requests, ``gemini-3.8-flash``, finished in
309 seconds (pending, queued at 32 s, running at 97 s, succeeded), three of
three answered.

Flow, exactly as run:

* credentials: ``vertex_credentials.json`` (ignored by git), service account
  ``video-pipeline@videos-498005.iam.gserviceaccount.com``. Token via
  ``google.oauth2.service_account.Credentials.from_service_account_file``
  with the cloud-platform scope, refreshed. ``google-auth`` arrives with
  ``google-cloud-storage`` (in requirements). Imported inside the function.
* bucket ``videos-498005-batch``, prefix
  ``sanskritam-word-origins/<run id>/``. The account can create, read, list
  and delete objects there and cannot list buckets.
* upload the JSONL (``uploadType=media``), one line per request (7.2 shape),
* create the job, poll every 30 seconds to a terminal state, save the job
  name the moment it is created so ``collect`` can resume later,
* output: ``outputInfo.gcsOutputDirectory`` + ``/predictions.jsonl``. Lines
  come back in a different order: match by ``key``. A failed line carries
  its error in ``status`` with an empty ``response``. Reply text is
  ``response.candidates[0].content.parts[*].text``. Tokens come from
  ``response.usageMetadata`` (promptTokenCount, candidatesTokenCount,
  thoughtsTokenCount ~150 per request in the probe). Batch is half the
  real-time rate (Google's page, read). Objects are left in the bucket;
  deleting is the owner's call.

No network in tests: pass ``http`` (an httpx-like client with
``.post``/``.get``) to :class:`VertexBatchClient`. Never log the token or
the credentials file contents.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Callable, Optional

logger = logging.getLogger("shabd.vertex_batch")

TERMINAL_STATES = frozenset({
    "JOB_STATE_SUCCEEDED",
    "JOB_STATE_PARTIALLY_SUCCEEDED",
    "JOB_STATE_FAILED",
    "JOB_STATE_CANCELLED",
    "JOB_STATE_EXPIRED",
})

CLOUD_SCOPE = ["https://www.googleapis.com/auth/cloud-platform"]


def load_token(credentials_path: str) -> str:
    """OAuth token for the Vertex service account. Imported here, never logged."""
    import google.auth.transport.requests  # lazy: google-auth only needed for live runs
    from google.oauth2 import service_account

    creds = service_account.Credentials.from_service_account_file(
        credentials_path, scopes=CLOUD_SCOPE
    )
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token


def build_request_line(
    key: str, system_text: str, user_text: str, max_tokens: int = 8000
) -> dict:
    """One line of the batch input file (7.2 shape)."""
    return {
        "key": key,
        "request": {
            "systemInstruction": {"parts": [{"text": system_text}]},
            "contents": [{"role": "user", "parts": [{"text": user_text}]}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json",
            },
        },
    }


def to_jsonl(lines: list[dict]) -> str:
    return "\n".join(json.dumps(line, ensure_ascii=False) for line in lines) + "\n"


def build_job_body(
    display_name: str,
    model: str,
    input_uris: list[str],
    output_uri_prefix: str,
) -> dict:
    return {
        "displayName": display_name,
        "model": model,
        "inputConfig": {"instancesFormat": "jsonl", "gcsSource": {"uris": input_uris}},
        "outputConfig": {
            "predictionsFormat": "jsonl",
            "gcsDestination": {"outputUriPrefix": output_uri_prefix},
        },
    }


def is_terminal_state(state: str) -> bool:
    return (state or "") in TERMINAL_STATES


def extract_reply_text(response: dict) -> str:
    """Reply text: response.candidates[0].content.parts[*].text."""
    try:
        cands = (response or {}).get("candidates") or []
        if not cands:
            return ""
        parts = ((cands[0] or {}).get("content") or {}).get("parts") or []
        return "".join(str((p or {}).get("text") or "") for p in parts)
    except Exception:
        return ""


def count_tokens(response: dict) -> tuple[int, int, int]:
    """(prompt, candidates, thoughts) from response.usageMetadata."""
    usage = (response or {}).get("usageMetadata") or {}
    try:
        return (
            int(usage.get("promptTokenCount") or 0),
            int(usage.get("candidatesTokenCount") or 0),
            int(usage.get("thoughtsTokenCount") or 0),
        )
    except Exception:
        return (0, 0, 0)


def parse_predictions_jsonl(text: str) -> dict[str, dict]:
    """Output lines keyed by ``key`` (lines come back in a different order).

    Returns ``{key: {text, status, error, prompt_tokens, candidates_tokens,
    thoughts_tokens, raw}}``. A failed line has its error in ``status`` and
    an empty ``response``.
    """
    out: dict[str, dict] = {}
    for raw_line in (text or "").splitlines():
        line = raw_line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        key = obj.get("key")
        if not key:
            continue
        status = obj.get("status") or ""
        response = obj.get("response") or {}
        if isinstance(status, dict):
            code = str(status.get("code") or "")
            msg = str(status.get("message") or status)
            error = msg if code in ("", "0") else f"{code}: {msg}"
            failed = code not in ("", "0")
        else:
            error = str(status) if status else ""
            failed = bool(status)
        if not response:
            failed = failed or False
            out[str(key)] = {
                "text": "", "status": "failed" if error else "empty",
                "error": error or "empty response",
                "prompt_tokens": 0, "candidates_tokens": 0,
                "thoughts_tokens": 0, "raw": obj,
            }
            continue
        prompt_n, cand_n, thought_n = count_tokens(response)
        out[str(key)] = {
            "text": extract_reply_text(response),
            "status": "failed" if failed else "ok",
            "error": error,
            "prompt_tokens": prompt_n,
            "candidates_tokens": cand_n,
            "thoughts_tokens": thought_n,
            "raw": obj,
        }
    return out


def sum_tokens(parsed: dict[str, dict]) -> dict[str, int]:
    prompt = sum(v.get("prompt_tokens", 0) for v in parsed.values())
    cand = sum(v.get("candidates_tokens", 0) for v in parsed.values())
    thought = sum(v.get("thoughts_tokens", 0) for v in parsed.values())
    return {
        "prompt_tokens": prompt,
        "candidates_tokens": cand,
        "thoughts_tokens": thought,
        "total_tokens": prompt + cand + thought,
        "answered": sum(1 for v in parsed.values() if v.get("status") == "ok"),
        "failed": sum(1 for v in parsed.values() if v.get("status") != "ok"),
    }


def gcs_object_name(prefix: str, run_id: str, step: str, name: str) -> str:
    return f"{prefix}/{run_id}/{step}/{name}".strip("/")


class VertexBatchClient:
    """Thin wrapper over the exact REST calls proven on 2026-10-02.

    ``http`` is injected in tests (a stub with ``.post``/``.get`` returning
    ``.status_code``/``.json()``/``.text``). In live runs it defaults to an
    httpx.Client. ``token`` may be injected to avoid refreshing credentials
    in tests.
    """

    def __init__(
        self,
        credentials_path: str,
        project: str = "videos-498005",
        bucket: str = "videos-498005-batch",
        prefix: str = "sanskritam-word-origins",
        location: str = "global",
        model: str = "gemini-3.8-flash",
        http=None,
        token: str = "",
    ) -> None:
        self.credentials_path = credentials_path
        self.project = project
        self.bucket = bucket
        self.prefix = prefix.strip("/")
        self.location = location
        self.model = f"publishers/google/models/{model}" if "/" not in model else model
        self._http = http
        self._token = token

    def _client(self):
        if self._http is not None:
            return self._http
        import httpx  # lazy: tests inject a stub instead

        return httpx.Client(timeout=120, follow_redirects=True)

    def _headers(self) -> dict[str, str]:
        token = self._token or load_token(self.credentials_path)
        # The token is never logged.
        return {"Authorization": f"Bearer {token}"}

    def _close_if_owned(self, client) -> None:
        if self._http is None:
            try:
                client.close()
            except Exception:
                pass

    # -- upload -----------------------------------------------------------

    def upload_input(self, object_name: str, jsonl_text: str) -> dict:
        """PUT the JSONL to the batch bucket. Returns the response JSON."""
        from urllib.parse import quote

        client = self._client()
        try:
            url = (
                "https://storage.googleapis.com/upload/storage/v1/b/"
                f"{self.bucket}/o?uploadType=media&name={quote(object_name, safe='')}"
            )
            headers = dict(self._headers())
            headers["Content-Type"] = "application/jsonl"
            r = client.post(url, headers=headers, content=jsonl_text.encode("utf-8"))
            if r.status_code not in (200, 201):
                raise RuntimeError(f"upload failed HTTP {r.status_code}: {r.text[:300]}")
            try:
                return r.json()
            except Exception:
                return {"name": object_name}
        finally:
            self._close_if_owned(client)

    # -- create -----------------------------------------------------------

    def create_job(
        self, run_id: str, step: str, input_object: str, display_suffix: str = ""
    ) -> dict:
        """Create the batch job. Returns the job resource (with ``name``).

        The caller saves ``name`` to the working folder the moment it is
        created, so ``collect`` can resume in a later session.
        """
        client = self._client()
        try:
            url = (
                "https://aiplatform.googleapis.com/v1/projects/"
                f"{self.project}/locations/{self.location}/batchPredictionJobs"
            )
            display = f"sanskritam-word-origins-{run_id}-{step}"
            if display_suffix:
                display = f"{display}-{display_suffix}"
            body = build_job_body(
                display,
                self.model,
                [f"gs://{self.bucket}/{input_object}"],
                f"gs://{self.bucket}/{self.prefix}/{run_id}/{step}/output/",
            )
            r = client.post(url, headers=self._headers(), json=body)
            if r.status_code not in (200, 201):
                raise RuntimeError(f"create job failed HTTP {r.status_code}: {r.text[:300]}")
            job = r.json()
            if not job.get("name"):
                raise RuntimeError(f"create job returned no name: {str(job)[:300]}")
            logger.info("vertex batch job created: %s", job.get("name"))
            return job
        finally:
            self._close_if_owned(client)

    # -- poll -------------------------------------------------------------

    def get_job(self, job_name: str) -> dict:
        client = self._client()
        try:
            url = f"https://aiplatform.googleapis.com/v1/{job_name}"
            r = client.get(url, headers=self._headers())
            if r.status_code != 200:
                raise RuntimeError(f"get job failed HTTP {r.status_code}: {r.text[:300]}")
            return r.json()
        finally:
            self._close_if_owned(client)

    def poll_job(
        self,
        job_name: str,
        interval_s: float = 30.0,
        sleep_fn: Callable[[float], None] | None = None,
        max_polls: int = 0,
    ) -> dict:
        """Poll until a terminal state. Google: queue up to 72h, most finish <24h once running."""
        sleep = sleep_fn or time.sleep
        polls = 0
        while True:
            job = self.get_job(job_name)
            state = str(job.get("state") or "")
            if is_terminal_state(state):
                logger.info("vertex batch job %s ended: %s", job_name, state)
                return job
            polls += 1
            if max_polls and polls >= max_polls:
                return job
            sleep(interval_s)

    # -- output -----------------------------------------------------------

    def output_object_for_job(self, job: dict) -> str:
        """GCS object name of predictions.jsonl for a finished job."""
        info = (job or {}).get("outputInfo") or {}
        gcs_dir = str(info.get("gcsOutputDirectory") or "")
        # Form: gs://bucket/prefix/.../output/ -> object predictions.jsonl under it.
        if gcs_dir.startswith("gs://"):
            rest = gcs_dir[len("gs://"):].rstrip("/")
            parts = rest.split("/", 1)
            if len(parts) == 2 and parts[0] == self.bucket:
                return parts[1] + "/predictions.jsonl"
            # A job pointing outside our bucket (or a test stub): still
            # return the object path so download_text can fetch it; the
            # bucket in the URI wins for real downloads.
            if len(parts) == 2:
                return parts[1] + "/predictions.jsonl"
        # Fallback to our own convention.
        return ""

    def download_text(self, object_name: str) -> str:
        """Download a bucket object as text via the JSON API (alt=media)."""
        from urllib.parse import quote

        client = self._client()
        try:
            url = (
                "https://storage.googleapis.com/storage/v1/b/"
                f"{self.bucket}/o/{quote(object_name, safe='')}?alt=media"
            )
            r = client.get(url, headers=self._headers())
            if r.status_code != 200:
                raise RuntimeError(
                    f"download failed HTTP {r.status_code}: {r.text[:300]}"
                )
            return r.text
        finally:
            self._close_if_owned(client)

    def collect_predictions(self, job: dict, fallback_object: str = "") -> dict[str, dict]:
        """Download predictions.jsonl for ``job`` and parse it by key."""
        obj = self.output_object_for_job(job) or fallback_object
        if not obj:
            raise RuntimeError("job has no outputInfo.gcsOutputDirectory and no fallback")
        text = self.download_text(obj)
        return parse_predictions_jsonl(text)
