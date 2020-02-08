import rp from 'request-promise';
import request from 'request';

testKeywordSuggestions().catch(err => console.error(err));

async function testKeywordSuggestions() {
  request.get(
    {
      uri: 'http://localhost:3000/keyword',
    },
    (err, res) => {
      if (err) {
        console.log('err');
        console.log(err);
      }

      console.log(res);
    },
  );
}
