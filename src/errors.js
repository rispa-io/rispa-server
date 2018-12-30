class Redirect extends Error {
  constructor(newLocation) {
    super(`Redirect to '${newLocation}'`)

    this.newLocation = newLocation
  }
}

module.exports = {
  Redirect,
}
