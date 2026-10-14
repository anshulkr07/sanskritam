"""Turn Sarvam's header + PCM WAV transport fragments into playable PCM frames."""
import struct


class WavStream:
    def __init__(self):
        self.header = bytearray()
        self.tail = b""
        self.ready = False
        self.sample_rate = 24000
        self.samples = 0

    def feed(self, data: bytes) -> bytes:
        # The provider may retain the format for the socket's lifetime or
        # emit a new WAV header. Both forms occur across flushed clauses.
        if self.ready and data.startswith(b"RIFF") and data[8:12] == b"WAVE":
            self.ready = False; self.header.clear()
        if not self.ready:
            self.header.extend(data)
            if len(self.header) < 12:
                return b""
            if self.header[:4] != b"RIFF" or self.header[8:12] != b"WAVE":
                raise RuntimeError("The speech provider returned an invalid WAV stream.")
            offset = 12
            have_format = False
            while offset + 8 <= len(self.header):
                kind = self.header[offset:offset + 4]
                size = struct.unpack_from("<I", self.header, offset + 4)[0]
                offset += 8
                if kind == b"data":
                    if not have_format:
                        raise RuntimeError("The speech provider omitted the WAV audio format.")
                    # Streaming WAVs use 0xffffffff for their unknown length.
                    data = bytes(self.header[offset:])
                    self.header.clear(); self.ready = True
                    break
                if size > 65536:
                    raise RuntimeError("The speech provider returned an invalid WAV header.")
                if offset + size > len(self.header):
                    return b""
                if kind == b"fmt ":
                    if size < 16:
                        raise RuntimeError("The speech provider returned an invalid WAV audio format.")
                    encoding, channels, rate, _, _, bits = struct.unpack_from("<HHIIHH", self.header, offset)
                    if encoding != 1 or channels != 1 or bits != 16 or not 8000 <= rate <= 48000:
                        raise RuntimeError("The speech provider must return mono PCM16 audio.")
                    self.sample_rate = rate; have_format = True
                offset += size + (size % 2)
            if not self.ready:
                if len(self.header) > 65536:
                    raise RuntimeError("The speech provider returned an invalid WAV header.")
                return b""
        data = self.tail + data
        length = len(data) - len(data) % 2
        self.tail = data[length:]
        self.samples += length // 2
        return data[:length]

    def finish(self):
        if self.tail or not self.ready or not self.samples:
            raise RuntimeError("The speech provider returned incomplete or empty audio. Try another voice.")

    def begin_turn(self):
        self.samples = 0
