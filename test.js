

require('./lib/services').reload('nginx')
.then(()=> {
  console.log('reloaded')
})
.catch(err => {
  console.dir(err);
})