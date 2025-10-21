/*
 * Copyright Adam Pritchard 2014
 * MIT License : https://adampritchard.mit-license.org/
 */

"use strict";
/* jshint curly:true, noempty:true, newcap:true, eqeqeq:true, eqnull:true, es5:true, undef:true, devel:true, browser:true, node:true, evil:false, latedef:false, nonew:true, trailing:false, immed:false, smarttabs:true, expr:true */
/* global describe, expect, it, before, beforeEach, after, afterEach */
/* global _, markdownRender, htmlToText, marked, hljs, Utils */


// This function wraps `htmlString` in a `<div>` to make life easier for us.
// It should affect the testing behaviour, though -- good/bad elements in a
// `<div>` are still good/bad.
function createDocFrag(htmlString) {
  const docFrag = document.createDocumentFragment();
  const elem = document.createElement('div');
  elem.innerHTML = htmlString;
  docFrag.appendChild(elem);
  return docFrag;
}


describe('Utils', function() {
  it('should exist', function() {
    expect(Utils).to.exist;
  });

  describe('saferSetInnerHTML', function() {
    it('should set safe HTML without alteration', function() {
      var testElem = document.createElement('div');
      Utils.saferSetInnerHTML(testElem, '<p>hi</p>');

      var checkElem = document.createElement('div');
      checkElem.innerHTML = '<p>hi</p>';

      expect(testElem.isEqualNode(checkElem)).to.be.true;
    });

    it('should remove <script> elements', function() {
      var testElem = document.createElement('div');
      Utils.saferSetInnerHTML(testElem, '<b>hi</b><script>alert("oops")</script>there<script>alert("derp")</script>');

      var checkElem = document.createElement('div');
      checkElem.innerHTML = '<b>hi</b><script>alert("oops")</script>there<script>alert("derp")</script>';

      expect(testElem.isEqualNode(checkElem)).to.be.false;

      var safeElem = document.createElement('div');
      safeElem.innerHTML = '<b>hi</b>there';

      expect(testElem.isEqualNode(safeElem)).to.be.true;
    });

    it('should not remove safe attributes', function() {
      var testElem = document.createElement('div');
      Utils.saferSetInnerHTML(testElem, '<div id="rad" style="color:red">hi</div>');

      var checkElem = document.createElement('div');
      checkElem.innerHTML = '<div id="rad" style="color:red">hi</div>';

      expect(testElem.isEqualNode(checkElem)).to.be.true;

      expect(testElem.querySelector('#rad').style.color).to.equal('red');
    });

    it('should remove event handler attributes', function() {
      var testElem = document.createElement('div');
      Utils.saferSetInnerHTML(testElem, '<div id="rad" style="color:red" onclick="javascript:alert(\'derp\')">hi</div>');

      var checkElem = document.createElement('div');
      checkElem.innerHTML = '<div id="rad" style="color:red">hi</div>';

      expect(testElem.isEqualNode(checkElem)).to.be.true;

      expect(testElem.querySelector('#rad').style.color).to.equal('red');
      expect(testElem.querySelector('#rad').attributes.onclick).to.not.exist;
    });

  });

  describe('saferSetOuterHTML', function() {
    beforeEach(function() {
      // Our test container element, which will not be modified
      const container = document.createElement('div');
      container.id = 'test-container';
      container.style.display = 'none';
      container.innerHTML = '<div id="test-elem"></div>';
      document.body.appendChild(container);
    });

    afterEach(function() {
      const container = document.getElementById('test-container');
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it('should throw exception if element not in DOM', function() {
      const testElem = document.createElement('div');
      testElem.innerHTML = '<b>bye</b>';

      const fn = _.partial(Utils.saferSetOuterHTML, '<p></p>');

      expect(fn).to.throw(Error);
    });

    it('should set safe HTML without alteration', function() {
      const container = document.getElementById('test-container');
      Utils.saferSetOuterHTML(container.firstElementChild, '<p>hi</p>');

      expect(container.innerHTML).to.equal('<p>hi</p>');
    });

    it('should remove <script> elements', function() {
      const container = document.getElementById('test-container');
      Utils.saferSetOuterHTML(container.firstElementChild, '<b>hi</b><script>alert("oops")</script>there<script>alert("derp")</script>');

      expect(container.innerHTML).to.equal('<b>hi</b>there');
    });

    it('should not remove safe attributes', function() {
      const container = document.getElementById('test-container');
      Utils.saferSetOuterHTML(container.firstElementChild, '<div id="rad" style="color:red">hi</div>');

      expect(container.innerHTML).to.equal('<div id="rad" style="color:red">hi</div>');
    });

    it('should remove event handler attributes', function() {
      const container = document.getElementById('test-container');
      Utils.saferSetOuterHTML(container.firstElementChild, '<div id="rad" style="color:red" onclick="javascript:alert(\'derp\')">hi</div>');

      expect(container.innerHTML).to.equal('<div id="rad" style="color:red">hi</div>');
    });

    // An earlier implementation of Utils.saferSetOuterHTML was vulnerable to allowing
    // script execution through the on error and onload handlers of an image element.
    // Unfortunately, on the test page this manifested as a CSP error, so this test never
    // actually failed, even when the vulnerability was present. This test is a reminder
    // of that vulnerability, and there should not be any console CSP errors when it is run.
    it('should not execute img onerror handlers', function() {
      // Another test showing script execution through different vectors
      window.imgErrorExecuted = false;

      var maliciousHTML = '<div>before</div><img src="nonexistent.jpg" onerror="window.imgErrorExecuted = true;"><div>after</div>';

      const container = document.getElementById('test-container');
      Utils.saferSetOuterHTML(container.firstElementChild, maliciousHTML);

      // The onerror handler should NOT have executed
      expect(window.imgErrorExecuted).to.be.false;

      // Clean up
      delete window.imgErrorExecuted;
    });
  });


  describe('getDocumentFragmentHTML', function() {
    const makeFragment = function(htmlArray) {
      const docFrag = document.createDocumentFragment();
      htmlArray.forEach(function(html) {
        const template = document.createElement('template');
        template.innerHTML = html;
        docFrag.appendChild(template.content.firstElementChild);
      });

      return docFrag;
    };

    const makeTextFragment = function(text) {
      const docFrag = document.createDocumentFragment();
      const textNode = document.createTextNode(text);
      docFrag.appendChild(textNode);
      return docFrag;
    };

    it('should be okay with an empty fragment', function() {
      expect(Utils.getDocumentFragmentHTML(makeFragment([]))).to.equal('');
    });

    it('should return correct html', function() {
      var htmlArray = [
        '<div>aaa</div>',
        '<span><b>bbb</b></span>'
      ];

      var expectedHTML = htmlArray.join('');

      expect(Utils.getDocumentFragmentHTML(makeFragment(htmlArray))).to.equal(expectedHTML);
    });

    // Test issue #133: https://github.com/adam-p/markdown-here/issues/133
    // Thunderbird: raw HTML not rendering properly.
    // HTML text nodes were not being escaped properly.
    it('should escape HTML in a text node', function() {
      var docFrag = makeTextFragment('<span style="color:blue">im&blue</span>');
      var expectedHTML = '&lt;span style="color:blue"&gt;im&amp;blue&lt;/span&gt;';
      expect(Utils.getDocumentFragmentHTML(docFrag)).to.equal(expectedHTML);
    });
  });


  describe('isElementDescendant', function() {
    let testOuter;

    before(function() {
      testOuter = document.createElement('div');
      testOuter.id = 'isElementDescendant-0';
      testOuter.innerHTML = '<div id="isElementDescendant-1"><div id="isElementDescendant-1-1"></div></div>' +
                            '<div id="isElementDescendant-2"><div id="isElementDescendant-2-1"></div></div>';
      document.body.appendChild(testOuter);
    });

    after(function() {
      if (testOuter && testOuter.parentNode) {
        testOuter.parentNode.removeChild(testOuter);
      }
    });

    it('should correctly detect descendency', function() {
      expect(Utils.isElementDescendant(
        document.querySelector('#isElementDescendant-2'),
        document.querySelector('#isElementDescendant-2-1'))).to.equal(true);

      expect(Utils.isElementDescendant(
        document.querySelector('#isElementDescendant-0'),
        document.querySelector('#isElementDescendant-2-1'))).to.equal(true);
    });

    it('should correctly detect non-descendency', function() {
      expect(Utils.isElementDescendant(
        document.querySelector('#isElementDescendant-2-1'),
        document.querySelector('#isElementDescendant-2'))).to.equal(false);

      expect(Utils.isElementDescendant(
        document.querySelector('#isElementDescendant-2-1'),
        document.querySelector('#isElementDescendant-0'))).to.equal(false);

      expect(Utils.isElementDescendant(
        document.querySelector('#isElementDescendant-1'),
        document.querySelector('#isElementDescendant-2'))).to.equal(false);
    });
  });


  describe('getLocalFile', function() {
    it('should return correct text data', function(done) {
      var KNOWN_PREFIX = '<!DOCTYPE html>';
      var callback = function(data) {
        expect(data.slice(0, KNOWN_PREFIX.length)).to.equal(KNOWN_PREFIX);
        done();
      };

      Utils.getLocalFile('../options.html', 'text', callback);
    });

    it('should return correct json data', function(done) {
      var callback = function(data) {
        expect(data).to.be.an('object');
        expect(data).to.have.property('app_name');
        done();
      };

      Utils.getLocalFile('/_locales/en/messages.json', 'json', callback);
    });

    it('should return correct base64 data', function(done) {
      // We "know" our logo file starts with this string when base64'd
      var KNOWN_PREFIX = 'iVBORw0KGgo';
      var callback = function(data) {
        expect(data.slice(0, KNOWN_PREFIX.length)).to.equal(KNOWN_PREFIX);
        done();
      };

      Utils.getLocalFile('../images/icon16.png', 'base64', callback);
    });

    it('should work with getLocalURL', function(done) {
      var KNOWN_PREFIX = '<!DOCTYPE html>';
      var callback = function(data) {
        expect(data.slice(0, KNOWN_PREFIX.length)).to.equal(KNOWN_PREFIX);
        done();
      };

      Utils.getLocalFile(Utils.getLocalURL('/common/options.html'), 'text', callback);
    });

    /* If we switch to promises rather than asynchronous callbacks, we can use these tests again.
    it('should supply an error arg to callback if file not found', function(done) {
      try {
        Utils.getLocalFile('badfilename', 'text', function(val, err) {
        });
      }
      catch (e) {
        done();
      }
    });

    it('should supply an error arg to callback if dataType is bad', function(done) {
      Utils.getLocalFile('../options.html', 'nope', function(val, err) {
        expect(err).to.be.ok;
        expect(val).to.not.be.ok;
        done();
      });
    });
    */
  });

  describe('getLocalURL', function() {
    it('should return a URL that can be used successfully', function(done) {
      // We're going to cheat a little and use the URL in a request to make
      // sure it works.
      // It would be tough to test otherwise without replicating the internal
      // logic of the function.

      var KNOWN_PREFIX = '<!DOCTYPE html>';
      var callback = function(data) {
        expect(data.slice(0, KNOWN_PREFIX.length)).to.equal(KNOWN_PREFIX);
        done();
      };

      var url = Utils.getLocalURL('/common/options.html');
      Utils.getLocalFile(url, 'text', callback);
    });
  });

  describe('fireMouseClick', function() {
    it('should properly fire a click event', function(done) {
      var elem = document.createElement('button');
      document.body.appendChild(elem);
      elem.addEventListener('click', function(event) {
        expect(event[Utils.MARKDOWN_HERE_EVENT]).to.be.true;
        document.body.removeChild(elem);
        done();
      });

      Utils.fireMouseClick(elem);
    });
  });

  describe('makeRequestToPrivilegedScript', function() {
    it('should communicate with privileged script', function(done) {
      Utils.makeRequestToPrivilegedScript(
        document,
        { action: 'test-request' },
        function(response) {
          expect(response).to.equal('test-request-good');
          done();
        });
    });
  });

  describe('setFocus', function() {
    it('should set focus into a contenteditable div', function() {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      document.body.appendChild(div);
      expect(document.activeElement).to.not.equal(div);

      Utils.setFocus(div);
      expect(document.activeElement).to.equal(div);

      div.parentNode.removeChild(div);
    });

    it('should set focus into an iframe with contenteditable body', function() {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      iframe.contentDocument.body.contentEditable = true;
      expect(document.activeElement).to.not.equal(iframe);

      Utils.setFocus(iframe.contentDocument.body);
      expect(document.activeElement).to.equal(iframe);
      expect(iframe.contentDocument.activeElement).to.equal(iframe.contentDocument.body);

      iframe.parentNode.removeChild(iframe);
    });
  });

  describe('setFocus', function() {
    it('should not explode', function() {
      Utils.consoleLog('setFocus did not explode');
    });
  });

  describe('getTopURL', function() {
    it('should get the URL in a simple case', function() {
      expect(Utils.getTopURL(window)).to.equal(location.href);
    });

    it('should get the URL from an iframe', function() {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      expect(Utils.getTopURL(iframe.contentWindow)).to.equal(location.href);
      iframe.parentNode.removeChild(iframe);
    });

    it('should get the hostname', function() {
      expect(Utils.getTopURL(window, true)).to.equal(location.hostname);
    });
  });

  describe('nextTick', function() {
    it('should call callback asynchronously and quickly', function(done) {
      var start = new Date();
      var called = false;
      Utils.nextTick(function() {
        called = true;
        expect(new Date() - start).to.be.lessThan(200);
        done();
      });
      expect(called).to.equal(false);
    });

    it('should properly set context', function(done) {
      var ctx = { hi: 'there' };

      Utils.nextTick(function() {
        expect(this).to.equal(ctx);
        done();
      }, ctx);
    });
  });

  describe('nextTickFn', function() {
    it('should return a function', function() {
      expect(Utils.nextTickFn(function(){})).to.be.a('function');
    });

    it('should return a function that calls callback asynchronously and quickly', function(done) {
      var start = new Date();
      var called = false;
      var fn = Utils.nextTickFn(function() {
        called = true;
        expect(new Date() - start).to.be.lessThan(200);
        done();
      });
      fn();
      expect(called).to.equal(false);
    });

    it('should properly set context', function(done) {
      var ctx = { hi: 'there' };

      var fn = Utils.nextTickFn(function() {
        expect(this).to.equal(ctx);
        done();
      }, ctx);
      fn();
    });
  });

  describe('getMessage', function() {
    it('should return a string', function() {
      // Since the exact string retuned depends on the current browser locale,
      // we'll just check that some string is returned.
      expect(Utils.getMessage('options_page__page_title')).to.be.a('string');
    });

    it('should throw on bad message ID', function() {
      var fn = _.partial(Utils.getMessage, 'BAADF00D');
      expect(fn).to.throw(Error);
    });
  });

  describe('semverGreaterThan', function() {
    it('should correctly order version strings', function() {
      // Since the exact string retuned depends on the current browser locale,
      // we'll just check that some string is returned.
      expect(Utils.semverGreaterThan('1.11.1', '1.2.2')).to.be.true;
      expect(Utils.semverGreaterThan('11.1.1', '2.2.2')).to.be.true;
      expect(Utils.semverGreaterThan('11.1.1', '11.1.0')).to.be.true;
      expect(Utils.semverGreaterThan('9.0.0', '10.0.0')).to.be.false;
      expect(Utils.semverGreaterThan('9.0.2', '9.0.100')).to.be.false;
      expect(Utils.semverGreaterThan('0.99', '1.0')).to.be.false;
    });

    it('should cope with non-semver input', function() {
      expect(Utils.semverGreaterThan('nope', '1.0')).to.be.true.and.to.not.throw;
      expect(Utils.semverGreaterThan('1.0', 'nope')).to.be.false.and.to.not.throw;
    });

    it('should return false on falsy input', function() {
      expect(Utils.semverGreaterThan(null, '1.0')).to.be.false;
      expect(Utils.semverGreaterThan('1.0', null)).to.be.false;
    });
  });

  describe('walkDOM', function() {
    beforeEach(function() {
      const container = document.createElement('div');
      container.id = 'test-container';
      container.style.display = 'none';
      container.innerHTML = '<div id="test-elem"></div>';
      document.body.appendChild(container);
    });

    afterEach(function() {
      const container = document.getElementById('test-container');
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it('should find an element in the DOM', function() {
      let found = false;
      Utils.walkDOM(document.body, function(node) {
        found = found || node.id === 'test-elem';
      });
      expect(found).to.be.true;
    });
  });

  describe('utf8StringToBase64', function() {
    it('should correctly encode a foreign-character string', function() {
      var str = 'hello, こんにちは';
      var base64 = 'aGVsbG8sIOOBk+OCk+OBq+OBoeOBrw==';
      expect(Utils.utf8StringToBase64(str)).to.equal(base64);
    });
  });

  describe('base64ToUTF8String', function() {
    it('should correctly encode a foreign-character string', function() {
      var str = 'این یک جمله آزمون است.';
      var base64 = '2KfbjNmGINuM2qkg2KzZhdmE2Ycg2KLYstmF2YjZhiDYp9iz2Kou';
      expect(Utils.base64ToUTF8String(base64)).to.equal(str);
    });
  });

  describe('rangeIntersectsNode', function() {
    beforeEach(function() {
      const container = document.createElement('div');
      container.id = 'test-container';
      container.style.display = 'none';
      container.innerHTML = '<div id="test-elem-1"></div><div id="test-elem-2"></div>';
      document.body.appendChild(container);
    });

    afterEach(function() {
      const container = document.getElementById('test-container');
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it('should detect a node in a range', function() {
      const range = document.createRange();
      const container = document.getElementById('test-container');
      range.selectNode(container);

      // Check the node that is selected.
      expect(Utils.rangeIntersectsNode(range, container)).to.be.true;

      // Check a node that is within the node that is selected.
      expect(Utils.rangeIntersectsNode(range, document.getElementById('test-elem-2'))).to.be.true;
    });

    it('should not detect a node not in a range', function() {
      const range = document.createRange();
      range.selectNode(document.getElementById('test-elem-1'));

      // The parent of the selected node *is* intersected.
      expect(Utils.rangeIntersectsNode(range, document.getElementById('test-container'))).to.be.true;

      // The sibling of the selected node *is not* intersected.
      expect(Utils.rangeIntersectsNode(range, document.getElementById('test-elem-2'))).to.be.false;
    });

    // I have found that Range.intersectsNode is broken on Chrome. I'm adding
    // test to see if/when it gets fixed.
    // TODO: This test seems flawed. Why would test-elem-2 intersect the range that just contains test-elem-1? Hand-testing suggests that this is working as expected in Chrome and Firefox. Code that works around this probably-nonexistent bug should be reconsidered (especially since Postbox support is dropped).
    it('Range.intersectsNode is broken on Chrome', function() {
      const range = document.createRange();
      range.selectNode(document.getElementById('test-elem-1'));

      if (typeof(window.chrome) !== 'undefined' && navigator.userAgent.indexOf('Chrome') >= 0) {
        expect(range.intersectsNode(document.getElementById('test-elem-2'))).to.be.true;
      }
    });
  });

});
