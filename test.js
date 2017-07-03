const createCertForDomains = require('./main').createCertForDomains;
const reloadService = require('./main').services.reload;

createCertForDomains(require('./certs/letsencrypt.json'), require('./config.json'))
.then(() => Promise.all([
  reloadService('nginx'),
  reloadService('postfix'),
  reloadService('dovecot')
]))
.then(() => {
  console.log('finished')
})
.catch(err => {
  console.log('failed')
  console.dir(err)
})