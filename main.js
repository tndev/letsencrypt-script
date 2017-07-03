'use strict'
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')

const callOpenSSL = require('./lib/openssl').createCsr
const callTinyAcme = require('./lib/acme').requestCrt
const testWellKnownReachability = require('./lib/utils').testWellKnownReachability
const get = require('./lib/http').get

function createCertForDomains (info, options) {
  var acmeChallengePath = options.acmeChallengePath
  var sslPath = options.sslPath
  var sslKey = options.sslKey

  var certName = info.name
  var domainList = []

  return testWellKnownReachability(info.domains, acmeChallengePath)
  // creat openssl config
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
  // create csr from config
  .then(() => {
    return callOpenSSL(info, {
      sslKey: sslKey,
      sslConfig: path.join(__dirname, 'tmp/' + certName + '.cnf'),
      sslCsr: path.join(__dirname, 'tmp/' + certName + '.csr')
    })
  })
  // create pem and get curren cross signed pem for stacking
  .then(() => {
    return Promise.all([
      callTinyAcme({
        accountKey: options.acmeKey,
        sslCsr: path.join(__dirname, 'tmp/' + certName + '.csr'),
        acmeChallengePath: acmeChallengePath
      }),
      get('https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem')
    ])
  })
  .then(pems => {
    // save old pem
    return fs.renameAsync(path.join(sslPath, certName + '.pem'), path.join(sslPath, certName + '-' + Date.now() + '.pem'))
    .catch(function (e) {})
    .then(() => {
      // write new pem
      return fs.writeFileAsync(path.join(sslPath, certName + '.pem'), pems.join(''))
    })
    // TODO validate pem
  })
}

module.exports.createCertForDomains = createCertForDomains
module.exports.services = require('./lib/services')
