"""Secret synchronization checks; no cloud calls or real credentials."""
import subprocess
import unittest
from sync_secret import sync_secret


class FakeCloud:
    def __init__(self, results):
        self.results=list(results)
        self.calls=[]

    def __call__(self, cmd, **kwargs):
        self.calls.append((cmd, kwargs.get('input')))
        code, out, err=self.results.pop(0)
        return subprocess.CompletedProcess(cmd,code,out,err)


OK=(0,b'',b'')
DESCRIBED=(0,b'projects/p/secrets/key\n',b'')
LATEST=(0,b'projects/p/secrets/key/versions/7\n',b'')
ADDED=(0,b'projects/p/secrets/key/versions/8\n',b'')


class SecretSyncTests(unittest.TestCase):
    def test_unchanged_reuses_existing_version_without_write(self):
        cloud=FakeCloud([DESCRIBED,LATEST,(0,b'same-value',b'')])
        self.assertEqual(sync_secret('p','key',b'same-value',cloud),'7')
        self.assertEqual(len(cloud.calls),3)
        self.assertEqual(cloud.calls[1][0][1:4], ['secrets', 'versions', 'list'])
        self.assertEqual(cloud.calls[1][0][4], 'key')
        self.assertNotIn('--secret=key', cloud.calls[1][0])
        self.assertIn('--filter=state=ENABLED',cloud.calls[1][0])
        self.assertFalse(any('add' in cmd or 'create' in cmd for cmd,_ in cloud.calls))

    def test_changed_adds_version_with_value_only_on_stdin(self):
        cloud=FakeCloud([DESCRIBED,LATEST,(0,b'old',b''),ADDED])
        self.assertEqual(sync_secret('p','key',b'new-value',cloud),'8')
        self.assertEqual(cloud.calls[-1][1],b'new-value')
        self.assertFalse(any('new-value' in arg for cmd,_ in cloud.calls for arg in cmd))

    def test_missing_secret_is_created(self):
        cloud=FakeCloud([(1,b'',b'NOT_FOUND: missing'),OK,ADDED])
        self.assertEqual(sync_secret('p','key',b'new',cloud),'8')
        self.assertEqual(cloud.calls[1][0][1:3],['secrets','create'])

    def test_existing_without_enabled_versions_adds_one(self):
        cloud=FakeCloud([DESCRIBED,OK,ADDED])
        self.assertEqual(sync_secret('p','key',b'value',cloud),'8')

    def test_permission_failure_does_not_write(self):
        cloud=FakeCloud([(1,b'',b'PERMISSION_DENIED')])
        with self.assertRaises(RuntimeError):sync_secret('p','key',b'value',cloud)
        self.assertEqual(len(cloud.calls),1)

    def test_unreadable_current_value_does_not_write(self):
        cloud=FakeCloud([DESCRIBED,LATEST,(1,b'',b'PERMISSION_DENIED')])
        with self.assertRaises(RuntimeError):sync_secret('p','key',b'value',cloud)
        self.assertEqual(len(cloud.calls),3)

    def test_comparison_preserves_trailing_newlines_and_binary_bytes(self):
        data=b'json-key\x00\n\n'
        cloud=FakeCloud([DESCRIBED,LATEST,(0,data,b'')])
        self.assertEqual(sync_secret('p','key',data,cloud),'7')
        cloud=FakeCloud([DESCRIBED,LATEST,(0,data,b''),ADDED])
        self.assertEqual(sync_secret('p','key',data.rstrip(b'\n'),cloud),'8')


if __name__=='__main__':unittest.main()
