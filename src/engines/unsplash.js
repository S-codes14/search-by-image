import {validateUrl} from 'utils/app';
import {findNode} from 'utils/common';
import {setFileInputData, initSearch, sendReceipt} from 'utils/engines';

const engine = 'unsplash';

async function search({session, search, image, storageIds}) {
  await findNode('div#app > div[data-test=client-side-hydration-complete]');

  // search not available with mobile layout
  const button = document.querySelector(
    'div#popover-visual-search-form-nav > button[title="Visual search"]'
  );

  if (button) {
    button.click();

    const inputSelector = 'input[type=file]';
    const input = await findNode(inputSelector);

    await setFileInputData(inputSelector, input, image);

    await sendReceipt(storageIds);

    input.dispatchEvent(new Event('change', {bubbles: true}));
  } else {
    const search = await fetch(
      'https://unsplash.com/napi/search/by_image/upload?content_type=' +
        image.imageType
    );

    if (search.status !== 200) {
      throw new Error(`API response: ${search.status}, ${await search.text()}`);
    }

    const searchData = await search.json();

    const imgForm = new FormData();
    imgForm.append('key', searchData.fields.key);
    imgForm.append('Content-Type', searchData.fields['Content-Type']);
    imgForm.append(
      'success_action_status',
      searchData.fields.success_action_status
    );
    imgForm.append('policy', searchData.fields.policy);
    imgForm.append('x-amz-credential', searchData.fields['x-amz-credential']);
    imgForm.append('x-amz-algorithm', searchData.fields['x-amz-algorithm']);
    imgForm.append('x-amz-date', searchData.fields['x-amz-date']);
    imgForm.append('x-amz-signature', searchData.fields['x-amz-signature']);

    imgForm.append('file', image.imageBlob, 'blob');

    const upload = await fetch(searchData.url, {
      mode: 'cors',
      method: searchData.method,
      body: imgForm
    });

    if (upload.status !== 201) {
      throw new Error(`API response: ${upload.status}, ${await upload.text()}`);
    }

    const data = new FormData();
    data.append('upload', searchData.fields.key);

    const result = await fetch('https://unsplash.com/napi/search/by_image', {
      mode: 'cors',
      method: 'POST',
      body: data
    });

    if (result.status !== 201) {
      throw new Error(`API response: ${result.status}, ${await result.text()}`);
    }

    const resultData = await result.json();

    const tabUrl = 'https://unsplash.com/s/visual/' + resultData.uuid;

    await sendReceipt(storageIds);

    if (validateUrl(tabUrl)) {
      window.location.replace(tabUrl);
    }
  }
}

function init() {
  initSearch(search, engine, taskId);
}

init();
