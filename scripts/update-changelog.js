import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pkgPath = path.join(__dirname, '../package.json');
const changelogPath = path.join(__dirname, '../CHANGELOG.md');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const version = pkg.version;
const date = new Date().toLocaleDateString('id-ID', {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
});

let changelogContent = '';
if (fs.existsSync(changelogPath)) {
  changelogContent = fs.readFileSync(changelogPath, 'utf-8');
}

// Check if version already exists to avoid duplicates
if (changelogContent.includes(`## [${version}]`)) {
  console.log(`Version ${version} already exists in CHANGELOG.md`);
  process.exit(0);
}

// Function to get commits since last version entry
function getCommits() {
  try {
    // Look for the most recent version in CHANGELOG.md
    const versionMatch = changelogContent.match(/## \[(\d+\.\d+\.\d+)\]/);
    const lastVersion = versionMatch ? versionMatch[1] : null;

    let gitCmd = 'git log --pretty=format:"- %s"';
    if (lastVersion) {
      // Try to find the commit that bumped the version to lastVersion
      // This is a heuristic: assume commit message contains the version number
      gitCmd = `git log --pretty=format:"- %s" HEAD...$(git log --all --grep="${lastVersion}" --format="%H" -n 1) || git log -n 10 --pretty=format:"- %s"`;
    } else {
      // If no previous version, just get last 10 commits
      gitCmd = 'git log -n 10 --pretty=format:"- %s"';
    }

    const commits = execSync(gitCmd).toString().trim();
    return commits || '- Pembaruan rutin dan optimasi.';
  } catch (e) {
    console.warn('Warning: Could not fetch git commits, using default message.');
    return '- Pembaruan sistem dan optimasi aplikasi.';
  }
}

const commitHistory = getCommits();

const entry = `
## [${version}] - ${date}
### Perubahan dalam versi ini:
${commitHistory}
`;

const newContent = `# Changelog\n\n${entry}\n${changelogContent.replace('# Changelog\n\n', '')}`;
fs.writeFileSync(changelogPath, newContent);
console.log(`Updated CHANGELOG.md for version ${version} with git history.`);
