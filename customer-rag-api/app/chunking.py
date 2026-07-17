from __future__ import annotations

import re


def normalize_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _split_long_block(block: str, size: int) -> list[str]:
    if len(block) <= size:
        return [block]
    sentences = [part.strip() for part in re.split(r"(?<=[。！？；.!?;])", block) if part.strip()]
    if len(sentences) <= 1:
        return [block[index:index + size] for index in range(0, len(block), size)]
    pieces: list[str] = []
    current = ""
    for sentence in sentences:
        if current and len(current) + len(sentence) > size:
            pieces.append(current)
            current = sentence
        else:
            current += sentence
    if current:
        pieces.append(current)
    return pieces


def chunk_text(text: str, size: int = 600, overlap: int = 80) -> list[str]:
    if size < 100:
        raise ValueError("chunk size 至少为 100")
    if overlap < 0 or overlap >= size:
        raise ValueError("chunk overlap 必须大于等于 0 且小于 chunk size")

    normalized = normalize_text(text)
    if not normalized:
        return []
    blocks: list[str] = []
    for block in re.split(r"\n\s*\n", normalized):
        blocks.extend(_split_long_block(block.strip(), size))

    chunks: list[str] = []
    current = ""
    for block in blocks:
        candidate = f"{current}\n\n{block}".strip() if current else block
        if current and len(candidate) > size:
            chunks.append(current)
            prefix = current[-overlap:] if overlap else ""
            current = f"{prefix}\n\n{block}".strip()
            if len(current) > size:
                chunks.extend(_split_long_block(current, size)[:-1])
                current = _split_long_block(current, size)[-1]
        else:
            current = candidate
    if current:
        chunks.append(current)
    return [chunk for chunk in chunks if chunk.strip()]
