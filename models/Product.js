'use strict';

let mongoose = require('mongoose');
let hash = require('hash.js');
let v = require('validator');

let fs = require('fs');
let flow = require('../lib/flowControl');

let productSchema = mongoose.Schema({
  
  name        : { type: String, index: true, lowercase: true, required: true },
  description : { type: String, index:true, lowercase:true, required: true },
  price       : { type: Number, index:true, unique: false, required: true },

});

/**
 * Load json - products
 */
productSchema.statics.loadJson = async function (file) {

  let data = await new Promise((resolve, reject) => {
    fs.readFile(file, { encoding: 'utf8' }, (err, data) => {
      return err ? reject(err) : resolve(data);
    });
  });

  console.log(file + ' read.');

  if (!data) {
    throw new Error(file + ' is empty!');
  }

  let products = JSON.parse(data).products;
  let numProducts = products.length;

  for (var i = 0; i < products.length; i++) {
    await (new Product(products[i])).save();
  }

  return numProducts;

};

productSchema.statics.exists = function (idProduct, cb) {
  Product.findById(idProduct, function (err, product) {
    if (err) return cb(err);
    return cb(null, product ? true : false);
  });
};

productSchema.statics.list = function (startRow, numRows, sortField, includeTotal, filters, cb) {

  let query = Product.find(filters);

  query.sort(sortField);
  query.skip(startRow);
  query.limit(numRows);

  return query.exec(function (err, rows) {
    if (err) return cb(err);

    // System logo for a date in an appointment
    rows.forEach((row) => {
      //row.foto = configApp.appURLBasePath + configApp.imageLogoDate;
    });

    let result = { rows };

    if (!includeTotal) return cb(null, result);

    // Includes total property
    Service.count({}, (err, total) => {
      if (err) return cb(err);
      result.total = total;
      return cb(null, result);
    });
  });
};

productSchema.statics.createRecord = function (product, cb) {
  // Validations
  let valErrors = [];
  if (!(v.isAlpha(product.name) && v.isLength(product.name, 2))) {
    valErrors.push({ field: 'name', message: __('validation_invalid', { field: 'name' }) });
  }

  if (valErrors.length > 0) {
    return cb({ code: 422, errors: valErrors });
  }

  // Check duplicates
  // Search product
  Product.findOne({ name: product.name.toLowerCase() }, function (err, exists) {
    if (err) {
      return cb(err);
    }
        
    // Service already exists
    if (exists) {
      return cb({ code: 409, message: __('product_name_duplicated') });
    } else {

      // Add new service
      new Product(product).save(cb);
    }
  });
};

var Product = mongoose.model('Product', productSchema);
