/**
 * Local logo files (public/assets/logos, origins in SOURCES.md there) for the sites a tip links to, so each resource shows as a small site card.
 * A site with no file here gets a lettered tile instead. Never hotlinked.
 */
const LOGOS: Record<string, string> = {
  "python.org": "python", "freecodecamp.org": "freecodecamp", "sqlbolt.com": "sqlbolt", "sqlitetutorial.net": "sqlite-tutorial",
  "github.com": "github", "kaggle.com": "kaggle", "lookerstudio.google.com": "looker-studio", "microsoft.com": "microsoft", "scikit-learn.org": "scikit-learn",
  "developers.google.com": "google-developers", "youtube.com": "youtube", "pytorch.org": "pytorch", "docker.com": "docker", "fastapi.tiangolo.com": "fastapi",
  "ml-ops.org": "mlops-org", "huggingface.co": "hugging-face", "toastmasters.org": "toastmasters", "mozilla.org": "mdn", "javascript.info": "javascript-info",
  "theodinproject.com": "the-odin-project", "react.dev": "react", "frontendmentor.io": "frontend-mentor", "web.dev": "web-dev", "restfulapi.net": "restfulapi",
  "postman.com": "postman", "testing-library.com": "testing-library", "pytest.org": "pytest", "playwright.dev": "playwright", "wireshark.org": "wireshark",
  "linuxfoundation.org": "linux-foundation", "splunk.com": "splunk", "securityonionsolutions.com": "security-onion", "cyberdefenders.org": "cyberdefenders",
  "aws.amazon.com": "aws", "skillbuilder.aws": "aws", "writethedocs.org": "write-the-docs", "coursera.org": "coursera", "edx.org": "edx", "kaggle.com/learn": "kaggle",
};

/** The host of a link without "www.", or "" when the link is not a URL. */
export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

/** The logo file name (without ".png") for a link's site, or null. A host matches itself or any parent host in the table. */
export function siteLogo(url: string): string | null {
  const host = hostOf(url);
  if (!host) return null;
  const parts = host.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const file = LOGOS[parts.slice(i).join(".")];
    if (file) return file;
  }
  return null;
}

export const LOGO_FILES: string[] = [...new Set(Object.values(LOGOS))];
