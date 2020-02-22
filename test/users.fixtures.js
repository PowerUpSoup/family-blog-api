function makeUsersArray() {
  return [
    {
      "id": 1,
      "name": "sean",
      "writer": true,
      "admin": true,
      "password": "admin",
      date_created: '2020-02-22T05:28:25.565Z'
    },
    {
      "id": 2,
      "name": "quinn",
      "writer": false,
      "admin": false,
      "password": "commentor",
      date_created: '2020-02-22T05:28:25.565Z'
    },
    {
      "id": 3,
      "name": "irene",
      "writer": true,
      "admin": false,
      "password": "writer",
      date_created: '2020-02-22T05:28:25.565Z'
    },
  ];
}

module.exports = {
  makeUsersArray
}
