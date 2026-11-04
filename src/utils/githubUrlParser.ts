export function extractGithubOwnerRepo(input: string): { owner: string; repo: string } | null {
  if (!input || typeof input !== 'string') return null;
  let str = input.trim();

  // If input contains markdown link format [title](url) or [title] (url)
  const mdMatch = str.match(/\[([^\]]+)\]\s*\(([^)]+)\)/);
  if (mdMatch) {
    str = mdMatch[2].includes('github.com') ? mdMatch[2] : (mdMatch[1].includes('/') ? mdMatch[1] : mdMatch[2]);
  }

  // Remove surrounding quotes, backticks, angle brackets, parentheses, brackets
  str = str.replace(/^[`"'\s<([{\\]+|[`"'\s>)}\]\\]+$/g, '');

  // Extract from SSH format: git@github.com:owner/repo.git
  const sshMatch = str.match(/git@github\.com:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
  if (sshMatch) {
    const owner = cleanIdentifier(sshMatch[1]);
    const repo = cleanIdentifier(sshMatch[2].replace(/\.git$/i, ''));
    if (isValidOwnerRepo(owner, repo)) return { owner, repo };
  }

  // Extract from standard GitHub URL: https://github.com/owner/repo/...
  const webMatch = str.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/i);
  if (webMatch) {
    const owner = cleanIdentifier(webMatch[1]);
    const repo = cleanIdentifier(webMatch[2].replace(/\.git$/i, ''));
    if (isValidOwnerRepo(owner, repo)) return { owner, repo };
  }

  // Match bare owner/repo format: owner/repo
  const bareMatch = str.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
  if (bareMatch) {
    const owner = cleanIdentifier(bareMatch[1]);
    const repo = cleanIdentifier(bareMatch[2].replace(/\.git$/i, ''));
    if (isValidOwnerRepo(owner, repo)) return { owner, repo };
  }

  return null;
}

function cleanIdentifier(id: string): string {
  if (!id) return '';
  return id
    .replace(/[\]\[\)\(<>"'`]/g, '')
    .replace(/^[\s_.-]+|[\s_.-]+$/g, '')
    .trim();
}

function isValidOwnerRepo(owner: string, repo: string): boolean {
  if (!owner || !repo) return false;
  // Valid GitHub usernames/orgs and repos contain alphanumeric characters, hyphens, underscores, or dots
  const validPattern = /^[a-zA-Z0-9_.-]+$/;
  return validPattern.test(owner) && validPattern.test(repo) && owner.length > 0 && repo.length > 0;
}
