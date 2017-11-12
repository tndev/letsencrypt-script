'use strict'
const crypto = require('crypto')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const pem = Promise.promisifyAll(require('pem'))
const get = require('./http').get

function certificateStat (certificate, options) {
  return pem.readCertificateInfoAsync(certificate)
    .then(info => {
      var daysRemaining = (info.validity.end - (new Date()).getTime()) / 1000 / 60 / 60 / 24
      
      return {
        surplusDomains: info.san.dns.filter(domain => options.domains.indexOf(domain) == -1),
        missingDomains: options.domains.filter(domain => info.san.dns.indexOf(domain) == -1),
        daysRemaining: daysRemaining
      }
    })
}

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
module.exports.certificateStat = certificateStat
