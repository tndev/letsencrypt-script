const x509 = require('x509')
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'))
const moment = require('moment')
const debug = require('debug')('tndev')
const testWellKnownReachability = require('./utils').testWellKnownReachability

async function checkIfCertificateNeedsToBeRenewed (buildInfo, options) {
  var certData

  debug('check certificate "%s"', buildInfo.name)

  try {
    certData = await fs.readFileAsync(buildInfo.certFile)

    debug('filter out domains where well known is not reachable')
    var validInfo = await testWellKnownReachability(buildInfo.info.domains, options.acmeChallengePath)
    buildInfo.info.domains = validInfo.valid

    if (buildInfo.info.domains.length === 0) {
      // if no domain then remove
      return false
    }

    // cert exists, check for expire date
    var parsedCert = x509.parseCert(certData.toString())
    var days = moment(parsedCert.notAfter).diff(moment(), 'days')
    debug('%s: expires in %i days', buildInfo.name, days)
    if (days < 30) {
      return true
    }

    // first domain should be equal to the commonName
    if (buildInfo.info.domains[0] !== parsedCert.subject.commonName) {
      debug('%s: first domain does not match common name', buildInfo.name)
      return true
    }

    // check if dmains and altNames have the same count
    if (buildInfo.info.domains.length !== parsedCert.altNames.length) {
      debug('%s: count of domain is different', buildInfo.name)
      return true
    }

    // check if the domains are the same
    for (let i = 0; i < buildInfo.info.domains.length; i++) {
      if (parsedCert.altNames.indexOf(buildInfo.info.domains[i]) === -1) {
        debug('%s: domain list does not match', buildInfo.name)
        return true
      }
    }

    return false
  } catch (err) {
    if (String(err).indexOf('ENOENT') === -1) {
      debug('%s: cert file not found', buildInfo.name)
      // if there is another error then re throw it
      throw err
    }

    // cert does not exist so request it
    return true
  }
}

async function filterCertificatesToRenew (certificateList, options) {
  return Promise.all(certificateList).filter(info => checkIfCertificateNeedsToBeRenewed(info, options))
}

module.exports.filterCertificatesToRenew = filterCertificatesToRenew
