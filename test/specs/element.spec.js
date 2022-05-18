describe('HTMLElement.prototype', function() {
  it('should patch the HTMLElement prototype', function() {
    expect(HTMLElement.prototype.hasOwnProperty('inert')).to.be.ok;
  });
});
