'use strict'
const Promise = require('bluebird')
const spawn = require('child_process').spawn

function createCsr (info, options) {
  var error = ''

  return new Promise((resolve, reject) => {
    var openssl = spawn('openssl', [ 'req', '-new', '-key', options.sslKey,
      '-config', options.sslConfig,
      '-out', options.sslCsr,
      '-subj', '/emailAddress=' + info.emailAddress +
              '/C=' + info.countryName +
              '/ST=' + info.stateName +
              '/L=' + info.localityName +
              '/O=' + info.organizationName +
              '/CN=' + info.domains[0] ], {
                stdio: ['pipe', 'ignore', 'pipe']
              })

    // openssl.stdout.on('data', data => {
    //   console.log(`stdout: ${data}`)
    // })

    openssl.stderr.on('data', data => {
      error += data
    })

    openssl.on('exit', code => {
      if (code !== 0) {
        reject(new Error(error))
      } else {
        resolve()
      }
    })
  })
}

module.exports.createCsr = createCsr
