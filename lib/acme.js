'use strict'
const Promise = require('bluebird')
const spawn = require('child_process').spawn
const path = require('path')

function requestCrt (options) {
  options = options || {}

  var tinyAcmePath = path.join(options.tmpPath, 'acme-tiny/acme_tiny.py')

  return new Promise((resolve, reject) => {
    var openssl = spawn('python', [ tinyAcmePath,
      '--account-key', options.accountKey,
      '--csr', options.sslCsr,
      '--acme-dir', options.acmeChallengePath])

    var finalData = ''
    openssl.stdout.on('data', data => {
      finalData += data
    })

    openssl.stderr.on('data', data => {
      console.log(`stderr: ${data}`)
    })

    openssl.on('exit', code => {
      if (code === 0) {
        resolve(finalData)
      } else {
        reject(new Error('acme failed with: ' + code))
      }
    })
  })
}

module.exports.requestCrt = requestCrt
