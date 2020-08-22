94SXE2Qe1nfjmT - Dmr - dJA
const AdwordsUser = require('node-adwords').AdwordsUser;

let user = new AdwordsUser({
  developerToken: '94SXE2Qe1nfjmT-Dmr-dJA', //your adwords developerToken
  userAgent: 'INSERT_COMPANY_NAME_HERE', //any company name
  clientCustomerId: 'INSERT_CLIENT_CUSTOMER_ID_HERE', //the Adwords Account id (e.g. 123-123-123)
  client_id: 'INSERT_OAUTH2_CLIENT_ID_HERE', //this is the api console client_id
  client_secret: 'INSERT_OAUTH2_CLIENT_SECRET_HERE',
  refresh_token: 'INSERT_OAUTH2_REFRESH_TOKEN_HERE'
});