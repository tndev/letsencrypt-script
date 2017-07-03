'use strict'
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')

const reloadService = require('./lib/services').reload
const callOpenSSL = require('./lib/openssl').createCsr
const callTinyAcme = require('./lib/acme').requestCrt
const get = require('./lib/http').get

function createCertForDomains (info, options) {
  var acmeChallengePath = options.acmeChallengePath
  var sslPath = options.sslPath

  var acmeAccountKey = options.acmeKey
  var sslKey = options.sslKey

  var certName = info.name
  var testContent = 'ads2134435123123'
  var domainList = []

  return fs.writeFileAsync(acmeChallengePath + '/test.txt', testContent)
  .then(() => {
    return Promise.all(info.domains)
  })
  .each(domain => {
    console.log('Check domain: ' + domain)
    return get('http://' + domain + '/.well-known/acme-challenge/test.txt')
    .then(info => {
      if (info !== testContent) {
        throw new Error('wrong content of test file')
      }
      domainList.push(domain)
    })
    .catch(err => {
      console.error('domain not valid: ' + domain + ' ' + err)
    })
  })
  .then(() => fs.readFileAsync('./openssl.conf'))
  .then(conf => {
    conf = conf.toString()
    conf = conf.replace('{{countryName}}', info.countryName)
    conf = conf.replace('{{stateName}}', info.stateName)
    conf = conf.replace('{{localityName}}', info.localityName)
    conf = conf.replace('{{organizationName}}', info.organizationName)
    conf = conf.replace('{{emailAddress}}', info.emailAddress)
    conf = conf.replace('{{commonName}}', domainList[0])

    let altNames = domainList.map((domain, index) => 'DNS.' + (index + 1) + ' = ' + domain)

    conf = conf.replace('{{alt_names}}', altNames.join('\n'))

    return fs.writeFileAsync(path.join(__dirname, 'tmp/' + certName + '.cnf'), conf.toString())
  })
  .then(() => {
    return callOpenSSL(info, {
      sslKey: sslKey,
      sslConfig: path.join(__dirname, 'tmp/' + certName + '.cnf'),
      sslCsr: path.join(__dirname, 'tmp/' + certName + '.csr')
    })
  })
  .then(() => {
    return Promise.all([
      callTinyAcme({
        accountKey: acmeAccountKey,
        sslCsr: path.join(__dirname, 'tmp/' + certName + '.csr'),
        acmeChallengePath: acmeChallengePath
      }),
      get('https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem')
    ])
  })
  .then(pems => {
    return fs.renameAsync(path.join(sslPath, certName + '.pem'), path.join(sslPath, certName + '-' + Date.now() + '.pem')).catch(function (e) {})
    .then(() => {
      return fs.writeFileAsync(path.join(sslPath, certName + '.pem'), pems.join(''))
    })
  })
  .then(() => fs.unlinkAsync(acmeChallengePath + '/test.txt'))
}

module.exports.createCertForDomains = createCertForDomains;
module.exports.services = require('./lib/services');