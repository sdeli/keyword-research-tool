import * as rp from 'request-promise';

(async () => {
  await testKeywordSuggestions();
})();

async function testKeywordSuggestions() {
  const options = {
    uri: 'https://localhost:3000/keyword/suggestion/atomic',
  };

  try {
    await rp(options);
  } catch (e) {
    console.log(e);
  }
}
