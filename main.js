'use strict'
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')
const debug = require('debug')('tndev')

const callOpenSSL = require('./lib/openssl').createCsr
const callTinyAcme = require('./lib/acme').requestCrt
const testWellKnownReachability = require('./lib/utils').testWellKnownReachability
const get = require('./lib/http').get

async function createCertForDomains (buildInfo, options) {
  var acmeChallengePath = options.acmeChallengePath
  var sslKey = options.sslKey

  var certName = buildInfo.name
  var domainList

  var info = await testWellKnownReachability(buildInfo.info.domains, acmeChallengePath)
  domainList = info.valid

  // create openssl config
  debug('read openssl tempalte')
  var conf = await fs.readFileAsync('./openssl.conf')

  conf = conf.toString()
  conf = conf.replace('{{countryName}}', buildInfo.info.countryName)
  conf = conf.replace('{{stateName}}', buildInfo.info.stateName)
  conf = conf.replace('{{localityName}}', buildInfo.info.localityName)
  conf = conf.replace('{{organizationName}}', buildInfo.info.organizationName)
  conf = conf.replace('{{emailAddress}}', buildInfo.info.emailAddress)
  conf = conf.replace('{{commonName}}', domainList[0])

  let altNames = domainList.map((domain, index) => 'DNS.' + (index + 1) + ' = ' + domain)

  conf = conf.replace('{{alt_names}}', altNames.join('\n'))

  debug('write config file to temporary directory %s', path.join(options.tmpPath, certName + '.cnf'))
  await fs.writeFileAsync(path.join(options.tmpPath, certName + '.cnf'), conf.toString())

  // create csr from config

  debug('call openssl to build csr file')
  await callOpenSSL(buildInfo.info, {
    sslKey: sslKey,
    sslConfig: path.join(options.tmpPath, certName + '.cnf'),
    sslCsr: path.join(options.tmpPath, certName + '.csr')
  })

  debug('request all pems')
  // create pem and get curren cross signed pem for stacking
  var pems = await Promise.all([
    callTinyAcme({
      path: options.tmpPath,
      accountKey: options.acmeKey,
      sslCsr: path.join(options.tmpPath, certName + '.csr'),
      acmeChallengePath: acmeChallengePath
    }),
    get('https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem')
  ])

  try {
    debug('backup old pem')
    // save old pem
    await fs.renameAsync(buildInfo.certFile, buildInfo.certFile + '-' + Date.now())
  } catch (e) {}

  // write new pem
  debug('write new pem')
  await fs.writeFileAsync(buildInfo.certFile, pems.join(''))

  // TODO validate pem
}

module.exports.createCertForDomains = createCertForDomains
module.exports.services = require('./lib/services')
