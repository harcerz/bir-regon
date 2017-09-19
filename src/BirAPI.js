const rp = require('request-promise');
const entities = require('entities');
const xml2js = require('xml2js');

const { LoginEnvelope, LogoutEnvelope, QueryEnvelope, FullEnvelope } = require('./envelopes');
const config = require('./config');

module.exports = class BirAPI {

  /**
   * Creates an instance of BirAPI.
   *
   * @param {string} url
   */
  constructor(url) {
    this._url = url;
    this._sessionID = null;
  }


  /**
   * Tries to authenticate to the BIR database. Returns the session ID.
   *
   * @param {string} apiKey
   * @returns {Promise<string>}
   */
  login(apiKey) {
    let loginEnvelope = new LoginEnvelope(this._url, apiKey);
    let loginOptions = BirAPI._getRequestOptions(this._url, loginEnvelope.toString());

    return rp(loginOptions)
      .then(body => {
        let bodyParts = config.loginEnvRegex.exec(body);
        return bodyParts ? bodyParts[1] : Promise.reject('Invalid api key');
      })
      .then(sessionID => {
        this._sessionID = sessionID;
        return sessionID;
      });
  }

  raportNameDetect(companyType, silosId)
  {
    let ret
    if(companyType == "P") ret = "PublDaneRaportPrawna";
    else 
    {
      switch(parseInt(silosId)) {
        case 1:
            ret = "PublDaneRaportDzialalnoscFizycznejCeidg";
            break;
        case 2:
            ret = "PublDaneRaportDzialalnoscFizycznejRolnicza";
            break;
        case 3:
            ret = "PublDaneRaportDzialalnoscFizycznejPozostala";
            break;
        case 4:
            ret = "PublDaneRaportDzialalnoscFizycznejWKrupgn";
            break;
      }
    } 
    return ret;
  }
  /**
   * Queries the BIR database for a specific NIP. Returns parsed company's information.
   *
   * @param {string} nip
   * @returns {Promise<Object>}
   */
  query(nip) {
    if (!this.isAuthenticated()) {
      return Promise.reject('Not authenticated');
    }

    let queryEnvelope = new QueryEnvelope(this._url, nip);
    let queryOptions = BirAPI._getRequestOptions(this._url, queryEnvelope.toString(),
      this._sessionID);

    return rp(queryOptions)
      .then(body => {
        let results = config.queryEnvRegex.exec(body);
        return results ? results[1] : Promise.reject('NIP not found or invalid');
      })
      .then(entities.decodeXML.bind(entities))
      .then(queryResultsString => new Promise((resolve, reject) =>
        xml2js.parseString(queryResultsString, (err, result) => err ? reject(err) : resolve(result))
      ))
      .then(queryResultsWrapped => queryResultsWrapped['root']['dane'])
      .then(queryResults => {
        let result = new Array;
        
        for (let i in queryResults) {
          let company = {};
          for (let key in queryResults[i]) {
            if (queryResults[i].hasOwnProperty(key)) {
              company[key] = Array.isArray(queryResults[i][key]) ? queryResults[i][key][0] : queryResults[i][key];
            }
          }
          result.push(company);
        }
        return result;
      });
  }

  full(regon, raportName) {
    if (!this.isAuthenticated()) {
      return Promise.reject('Not authenticated');
    }

    let fullEnvelope = new FullEnvelope(this._url, regon, raportName);
    let fullOptions = BirAPI._getRequestOptions(this._url, fullEnvelope.toString(),
      this._sessionID);

    return rp(fullOptions)
      .then(body => {
        let results = config.fullEnvRegex.exec(body);// TU KONIEC!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        return results ? results[1] : Promise.reject('REGON not found or invalid');
      })
      .then(entities.decodeXML.bind(entities))
      .then(fullResultsString => new Promise((resolve, reject) =>
        xml2js.parseString(fullResultsString, (err, result) => err ? reject(err) : resolve(result))
      ))
      .then(fullResultsWrapped => fullResultsWrapped['root']['dane'][0])
      .then(fullResults => {
        let result = {};
        for (let key in fullResults) {
          if (fullResults.hasOwnProperty(key)) {
            result[key] = Array.isArray(fullResults[key]) ? fullResults[key][0] : fullResults[key];
          }
        }
        //console.log(result)
        return result;
      });
  }

  logout() {
    if (!this.isAuthenticated()) {
      return Promise.reject();
    }
    this._sessionID = null;

    let logoutEnvelope = new LogoutEnvelope(this._url, this._sessionID);
    let logoutHeaders = BirAPI._getRequestOptions(this._url, logoutEnvelope.toString(),
      this._sessionID);

    return rp(logoutHeaders)
      .then(() => true);
  }


  /**
   * Checks if session ID already exists.
   *
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this._sessionID;
  }


  /**
   * Prepares request options, fills in the URL, body and session ID if provided.
   *
   * @static
   * @param {string} uri
   * @param {string} body
   * @param {string} [sessionID=null]
   * @returns {Object}
   */
  static _getRequestOptions(uri, body, sessionID = null) {
    let requestHeaders = Object.assign({}, config.commonOptions.headers);
    if (sessionID) {
      requestHeaders.sid = sessionID;
    }

    return Object.assign({}, config.commonOptions, {
      headers: requestHeaders,
      body,
      uri
    });
  }
};
