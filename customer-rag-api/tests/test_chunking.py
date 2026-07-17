from app.chunking import chunk_text, normalize_text


def test_normalize_and_chunk_chinese_text():
    text = "第一段内容。\r\n\r\n\r\n第二段内容比较长。" * 20
    chunks = chunk_text(text, size=120, overlap=20)
    assert len(chunks) > 1
    assert all(chunk.strip() for chunk in chunks)
    assert "\r" not in normalize_text(text)


def test_chunk_validation():
    try:
        chunk_text("内容", size=50)
    except ValueError as error:
        assert "至少" in str(error)
    else:
        raise AssertionError("invalid chunk size should fail")
