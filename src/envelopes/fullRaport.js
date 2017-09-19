const fullEnvelope = `
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:ns="http://CIS/BIR/PUBL/2014/07">
<soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
<wsa:To>{{ DESTINATION_URL }}</wsa:To>
<wsa:Action>http://CIS/BIR/PUBL/2014/07/IUslugaBIRzewnPubl/DanePobierzPelnyRaport</wsa:Action>            
</soap:Header>
  <soap:Body>
      <ns:DanePobierzPelnyRaport>
         <ns:pRegon>{{ REGON }}</ns:pRegon>         
         <ns:pNazwaRaportu>{{ RAPORTNAME }}</ns:pNazwaRaportu>
      </ns:DanePobierzPelnyRaport>
   </soap:Body>
</soap:Envelope>
`.trim();

module.exports = class FullEnvelope {
  constructor(destinationURL, REGON, raportName) {
    this._destinationURL = destinationURL;
    this._REGON = REGON;
    this._raportName = raportName;
  }

  toString() {
    return fullEnvelope.replace('{{ DESTINATION_URL }}', this._destinationURL)
    .replace('{{ REGON }}', this._REGON).replace('{{ RAPORTNAME }}', this._raportName);
  }
};
