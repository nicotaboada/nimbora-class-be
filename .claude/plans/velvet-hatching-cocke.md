# Fix: Add engagement_rate to instagram_scanner.py

## Change
Add missing `engagement_rate` field to the post dictionary in `get_account_posts()`.

## File
`.claude/skills/instagram-references-scan/scripts/instagram_scanner.py` line ~113

## Fix
Add `'engagement_rate': engagement_rate,` to the `posts.append({...})` dict.
