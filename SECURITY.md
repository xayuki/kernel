# Security policy

Do not publish API keys, access tokens, `.env` files, private chat exports, or browser storage data in issues or pull requests.

For a suspected vulnerability, contact the repository maintainer privately through the GitHub profile rather than posting exploit details publicly. Include the affected version, impact, and a concise reproduction when safe to do so.

Kernel is a browser-side, bring-your-own-key application. A user's provider key is stored in that user's browser storage and forwarded in the Authorization header through the same-origin Vercel Function to the selected API provider. The function does not persist or log the key.
