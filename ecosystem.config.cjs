module.exports = {
  apps: [
    {
      name: "bot",
      script: "./build/index.js",
      watch: "./build",
      node_args: '--env-file=.env',
      error_file: '.logs/error.log',
      out_file: '.logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      // log_type: 'json',
    },
  ],
  // deploy: {
  //   production: {
  //     user: "SSH_USERNAME",
  //     host: "SSH_HOSTMACHINE",
  //     ref: "origin/master",
  //     repo: "GIT_REPOSITORY",
  //     path: "DESTINATION_PATH",
  //     "pre-deploy-local": "",
  //     "post-deploy":
  //       "npm install && pm2 reload ecosystem.config.js --env production",
  //     "pre-setup": "",
  //   },
  // },
};
