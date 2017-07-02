'use strict'
const Promise = require('bluebird')
const spawn = require('child_process').spawn

function reload (name) {
  return new Promise((resolve, reject) => {
    var error = ''
    var service = spawn('sudo', [ 'service', name, 'reload' ], {
      stdio: ['pipe', 'ignore', 'pipe']
    })

    // service.stdout.on('data', data => {
    //   console.log(`stdout: ${data}`)
    // })

    service.stderr.on('data', data => {
      error += data
    })

    service.on('exit', code => {
      if (code !== 0) {
        reject(new Error(error))
      } else {
        resolve()
      }
    })
  })
}

module.exports.reload = reload
