const fs = require('fs')
const path = 'src/views/KioskLogin.vue'
let c = fs.readFileSync(path, 'utf8')

// Replace v-for in template to use a computed filtered list
c = c.replace('v-for="op in store.operators"', 'v-for="op in employeeOperators"')

// Inject computed property right before 'const modal = ref'
const inject = "const employeeOperators = computed(() => store.operators.filter(function(o){ return o.role === 'Employee' }))\n"
c = c.replace('const modal = ref', inject + 'const modal = ref')

fs.writeFileSync(path, c, 'utf8')
console.log('Done - Employee role filter applied to KioskLogin.vue')
