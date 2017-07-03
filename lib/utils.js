'use strict'
const crypto = require('crypto')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const get = require('./http').get

function testWellKnownReachability (domains, acmeChallengePath) {
  const sha1 = crypto.createHash('sha1')
  const testContent = sha1.update(Date.now().toString()).digest('hex')
  const reachableTestFile = acmeChallengePath + '/test.txt'

  var result = {valid: [], invalid: []}

  return fs.writeFileAsync(reachableTestFile, testContent)
  .then(() => Promise.all(domains))
  // test if well-know is configured correctly for domains
  .each(domain => {
    console.log('pre check: ' + domain)
    return get('http://' + domain + '/.well-known/acme-challenge/test.txt')
    .then(info => {
      if (info !== testContent) {
        throw new Error('wrong content of test file')
      }
      result.valid.push(domain)
    })
    .catch(err => {
      console.error('well-known valid: ' + domain + ' ' + err)

      result.invalid.push({domain: domain, error: err})
    })
  })
  .then(() => fs.unlinkAsync(reachableTestFile))
  .then(() => result)
}

module.exports.testWellKnownReachability = testWellKnownReachability
