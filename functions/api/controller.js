const getSample = async(req, res, next) => {
  try {
    return res.status(200).json({text: 'hello world'})
  } catch(e) {
    return next(e)
  }
}

module.exports ={
  getSample
}
