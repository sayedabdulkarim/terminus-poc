console.log("hello");

const executeShellCommand = require("./shell-command-executor");

// Example: Run a simple command
executeShellCommand('echo "Hello, World!"')
  .then(console.log)
  .catch(console.error);

// Example 1: Run a simple command
executeShellCommand('echo "Hello, World!"')
  .then(console.log)
  .catch(console.error);

// Example 2: Test a failing `cd` command
executeShellCommand("cd sdf").then(console.log).catch(console.error);

// Example 3: Test an invalid Node.js command
executeShellCommand("node ---v")
  .then((res) => console.log(res, " resssssss"))
  .catch(console.error);
