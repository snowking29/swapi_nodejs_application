// index.js
const axios = require("axios");
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const AWS = require('aws-sdk');
const uuid = require('uuid');

const VEHICLES_TABLE = process.env.VEHICLES_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDb;
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:3000'
  })
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
};

app.use(bodyParser.json({ strict: false }));

function getAllVehiclesfromSWAPI(page, vehicles) {
  page = page || 1;
  vehicles = vehicles || [];
  return axios
    .get(`https://swapi.py4e.com/api/vehicles/?page=${page}`)
    .then(response => {
      const rawVehicles = response.data;
      rawVehicles.results.forEach(vehicle => {
        vehicles.push(vehicle)
      });
      return getAllVehiclesfromSWAPI(page + 1, vehicles);
    }).catch( err => {
      return vehicles;
    });
}

app.get('/vehicles', async function (req, res) {
  const vehiculosFromApi = await getAllVehiclesfromSWAPI();

  var params = {
    TableName: VEHICLES_TABLE
  }
  dynamoDb.scan(params, (err,data) => {
    var vehiculosTotal = [];

    for (const vehiculos of vehiculosFromApi){
      const vehiculo_object = {
        nombre: vehiculos.name,
        modelo: vehiculos.model,
        fabricante: vehiculos.manufacturer,
        costo_en_creditos: vehiculos.cost_in_credits,
        longitud: vehiculos.length,
        velocidad_maxima_de_atmosfera: vehiculos.max_atmosphering_speed,
        tripulacion: vehiculos.crew,
        pasajeros: vehiculos.passengers,
        capacidad_de_carga: vehiculos.cargo_capacity,
        consumibles: vehiculos.consumables,
        clase_de_vehiculo: vehiculos.vehicle_class,
        pilotos: vehiculos.pilots,
        filmes: vehiculos.films,
        creado: vehiculos.created,
        editado: vehiculos.edited,
        id: vehiculos.url.replace(/["http://swapi.dev/api/vehicles/"]/g, '').replace("y4om", "")
      }
      vehiculosTotal.push(vehiculo_object);
    }

    for (const vehiculos of data.Items){
      const vehiculo_object = {
        nombre: vehiculos.nombre,
        modelo: vehiculos.modelo,
        fabricante: vehiculos.fabricante,
        costo_en_creditos: vehiculos.costo_en_creditos,
        longitud: vehiculos.longitud,
        velocidad_maxima_de_atmosfera: vehiculos.velocidad_maxima_de_atmosfera,
        tripulacion: vehiculos.tripulacion,
        pasajeros: vehiculos.pasajeros,
        capacidad_de_carga: vehiculos.capacidad_de_carga,
        consumibles: vehiculos.consumibles,
        clase_de_vehiculo: vehiculos.clase_de_vehiculo,
        pilotos: vehiculos.pilotos,
        filmes: vehiculos.filmes,
        creado: vehiculos.creado,
        editado: vehiculos.editado,
        id: vehiculos.vehicleId
      }
      vehiculosTotal.push(vehiculo_object);
    }
    const final_response = {
      vehiculosTotal,
      meta:{
        status:{
          code: "00",
          message_ilgn:[
            {
              value: `Se ejecutó correctamente el proceso.`,
              locale: "es_PE"
            }
          ]
        }
      }
    }
    res.json(final_response);
  });
})

app.get('/vehicles/:vehicleId', function (req, res) {
  return axios
    .get(`https://swapi.py4e.com/api/vehicles/${req.params.vehicleId}`)
    .then(response => {
      const body = response.data
      res.json({ 
        vehiculo:{
          nombre: body.name,
          modelo: body.model,
          fabricante: body.manufacturer,
          costo_en_creditos: body.cost_in_credits,
          longitud: body.length,
          velocidad_maxima_de_atmosfera: body.max_atmosphering_speed,
          tripulacion: body.crew,
          pasajeros: body.passengers,
          capacidad_de_carga: body.cargo_capacity,
          consumibles: body.consumables,
          clase_de_vehiculo: body.vehicle_class,
          pilotos: body.pilots,
          filmes: body.films,
          creado: body.created,
          editado: body.edited,
          id: body.url.replace(/["http://swapi.dev/api/vehicles/"]/g, '').replace("y4om", "")
        },
        meta:{
          status:{
            code: "00",
            message_ilgn:[
              {
                vehiculoId: req.params.vehicleId,
                value: `Se obtuvo satisfactoriamente el vehiculo.`,
                locale: "es_PE"
              }
            ]
          }
        }
      });
    }).catch( err =>{
      const params = {
        TableName: VEHICLES_TABLE,
        Key: {
          vehicleId: req.params.vehicleId,
        },
      }
    
      dynamoDb.get(params, (error, result) => {
        if (error) {
          console.log(error);
          res.status(400).json({
            meta:{
              status:{
                code: "01",
                message_ilgn:[
                  {
                    locale: "es_PE",
                    value: `Ha ocurrido un problema al intentar obtener el vehiculo.`
                  }
                ]
              }
            }
          });
        }
        if (result.Item) {
          res.json({ 
            vehiculo:{
              nombre: result.Item.nombre,
              modelo: result.Item.modelo,
              fabricante: result.Item.fabricante,
              costo_en_creditos: result.Item.costo_en_creditos,
              longitud: result.Item.longitud,
              velocidad_maxima_de_atmosfera: result.Item.velocidad_maxima_de_atmosfera,
              tripulacion: result.Item.tripulacion,
              pasajeros: result.Item.pasajeros,
              capacidad_de_carga: result.Item.capacidad_de_carga,
              consumibles: result.Item.consumibles,
              clase_de_vehiculo: result.Item.clase_de_vehiculo,
              pilotos: result.Item.pilotos,
              filmes: result.Item.filmes,
              creado: result.Item.creado,
              editado: result.Item.editado,
              id: result.Item.vehicleId
            },
            meta:{
              status:{
                code: "00",
                message_ilgn:[
                  {
                    vehiculoId: result.Item.vehicleId,
                    value: `Se obtuvo satisfactoriamente el vehiculo.`,
                    locale: "es_PE"
                  }
                ]
              }
            }
          });
        } else {
          res.status(404).json({
            meta:{
              status:{
                code: "01",
                message_ilgn:[
                  {
                    locale: "es_PE",
                    value: `Vehiculo no encontrado.`
                  }
                ]
              }
            }
          });
        }
      });
    })
})

app.post('/vehicles', function (req, res) {
  const { nombre } = req.body;
  if (typeof nombre !== 'string') {
    res.status(400).json({
      meta:{
        status:{
          code: "01",
          message_ilgn:[
            {
              locale: "es_PE",
              value: `El valor "nombre" debe ser un string.`
            }
          ]
        }
      }
    })
  }
  const vehicleId = uuid.v1();
  const params = {
    TableName: VEHICLES_TABLE,
    Item: {
      vehicleId: vehicleId,
      nombre: nombre,
      modelo: req.body.modelo,
      fabricante: req.body.fabricante,
      costo_en_creditos: req.body.costo_en_creditos,
      longitud: req.body.longitud,
      velocidad_maxima_de_atmosfera: req.body.velocidad_maxima_de_atmosfera,
      tripulacion: req.body.tripulacion,
      pasajeros: req.body.pasajeros,
      capacidad_de_carga: req.body.capacidad_de_carga,
      consumibles: req.body.consumibles,
      clase_de_vehiculo: req.body.clase_de_vehiculo,
      pilotos: req.body.pilotos,
      filmes: req.body.filmes,
      creado: req.body.creado,
      editado: req.body.editado
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      console.log(error);
      res.status(400).json({ 
        meta:{
          status:{
            code: "01",
            message_ilgn:[
              {
                locale: "es_PE",
                value: `No se pudo crear el vehiculo.`
              }
            ]
          }
        }
      })
    }
    res.json({ 
      meta:{
        status:{
          code: "00",
          message_ilgn:[
            {
              vehiculoId: vehicleId,
              value: `El vehiculo de nombre ${nombre} ha sido creado satisfactoriamente.`,
              locale: "es_PE"
            }
          ]
        }
      }
    });
  })
})

module.exports.handler = serverless(app);