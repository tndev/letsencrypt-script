'use strict'
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')

const callOpenSSL = require('./lib/openssl').createCsr
const callTinyAcme = require('./lib/acme').requestCrt
const testWellKnownReachability = require('./lib/utils').testWellKnownReachability
const get = require('./lib/http').get

function createCertForDomains (buildInfo, options) {
  var acmeChallengePath = options.acmeChallengePath
  var sslKey = options.sslKey

  var certName = buildInfo.name
  var domainList

  return testWellKnownReachability(buildInfo.info.domains, acmeChallengePath)
  .then(info => {
    domainList = info.valid
  })
  // creat openssl config
  .then(() => fs.readFileAsync('./openssl.conf'))
  .then(conf => {
    conf = conf.toString()
    conf = conf.replace('{{countryName}}', buildInfo.info.countryName)
    conf = conf.replace('{{stateName}}', buildInfo.info.stateName)
    conf = conf.replace('{{localityName}}', buildInfo.info.localityName)
    conf = conf.replace('{{organizationName}}', buildInfo.info.organizationName)
    conf = conf.replace('{{emailAddress}}', buildInfo.info.emailAddress)
    conf = conf.replace('{{commonName}}', domainList[0])

    let altNames = domainList.map((domain, index) => 'DNS.' + (index + 1) + ' = ' + domain)

    conf = conf.replace('{{alt_names}}', altNames.join('\n'))

    return fs.writeFileAsync(path.join(options.tmpPath, certName + '.cnf'), conf.toString())
  })
  // create csr from config
  .then(() => {
    return callOpenSSL(buildInfo.info, {
      sslKey: sslKey,
      sslConfig: path.join(options.tmpPath, certName + '.cnf'),
      sslCsr: path.join(options.tmpPath, certName + '.csr')
    })
  })
  // create pem and get curren cross signed pem for stacking
  .then(() => {
    return Promise.all([
      callTinyAcme({
        accountKey: options.acmeKey,
        sslCsr: path.join(options.tmpPath, certName + '.csr'),
        acmeChallengePath: acmeChallengePath
      }),
      get('https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem')
    ])
  })
  .then(pems => {
    // save old pem
    return fs.renameAsync(buildInfo.certFile, buildInfo.certFile + '-' + Date.now())
    .catch(function (e) {})
    .then(() => {
      // write new pem
      return fs.writeFileAsync(buildInfo.certFile, pems.join(''))
    })
    // TODO validate pem
  })
}

module.exports.createCertForDomains = createCertForDomains
module.exports.services = require('./lib/services')
