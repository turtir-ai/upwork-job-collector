# Security Policy

## 🔒 API Key Security

### ⚠️ CRITICAL: Exposed API Key Notice

The API key `AIzaSyDXo9-_1q5ErqPZAiJ_9BQL6pLNlkkGcEQ` was accidentally exposed in commit `0a4f608` and has been removed. 

**This key should be immediately revoked from Google Cloud Console:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Find and delete/regenerate this API key
3. Create a new API key and keep it secure

### Best Practices

1. **Never hardcode API keys** in source code
2. **Use environment variables** (.env files) for sensitive data
3. **Add .env to .gitignore** (already done)
4. **Use .env.example** for documentation without actual keys
5. **Rotate keys regularly** and after any exposure

## 🛡️ Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** open a public issue
2. Email the maintainer directly: turtir.ai@gmail.com
3. Include details of the vulnerability
4. Allow time for a fix before public disclosure

## 📋 Security Checklist

- [ ] No API keys in source code
- [ ] No passwords in source code
- [ ] No sensitive URLs in source code
- [ ] .env file is gitignored
- [ ] Dependencies are up to date
- [ ] Chrome extension permissions are minimal

## 🔐 Extension Security

This Chrome extension:
- Runs only on Upwork domains
- Stores data locally (no external servers)
- Does not collect personal information
- Does not transmit data to third parties
- Uses Chrome's secure storage API

## 📝 Changelog

- **2025-09-07**: Removed exposed API key from options.js
- **2025-09-07**: Added .env.example for secure configuration
- **2025-09-07**: Created security documentation
