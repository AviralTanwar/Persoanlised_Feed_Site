import hashlib


def make_item_id(url: str = "", title: str = "") -> str:
    key = url or title
    return hashlib.md5(key.encode()).hexdigest()[:16]
