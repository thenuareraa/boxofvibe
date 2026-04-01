const { execSync } = require('child_process');
try {
  execSync('npx netlify api createSiteBuild --data "{\\"site_id\\":\\"e36fd884-a6a5-4067-bb03-301aa96526f8\\"}"', { 
    stdio: 'inherit' 
  });
} catch (e) {
  console.error("Failed to trigger build!");
}
