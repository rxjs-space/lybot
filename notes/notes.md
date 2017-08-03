```js
      yield driver.executeScript(`
        var firstElement = document.evaluate('${xpathHash['owner.isPerson']}', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        firstElement.scrollIntoView();
      `)

```