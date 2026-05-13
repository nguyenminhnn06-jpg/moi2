const { promisify } = require("util")
const crypto = require("crypto")
const index = require("../../models/customer/index.model")
const order = require("../../models/customer/order.model")
const general = require("../../models/general.model")
const account = require("../../models/customer/account.model")
const cfg = require("../../config/index")

const orderController = () => { }

// [POST] /order/addCart
orderController.addCart = async (req, res) => {
	let customer_id = 0

	if (req.user) {
		customer_id = req.user.customer_id
	} else {
		return res.status(401).json({
			status: "NotAuth",
		})
	}

	let product_variant_id = req.body.product_variant_id
	let cart_quantity = req.body.cart_quantity

	let result = await order.addCart(
		customer_id,
		product_variant_id,
		cart_quantity
	)

	if (result) {
		return res.json({
			status: "success",
		})
	} else {
		return res.json({
			status: "error",
		})
	}
}

// [GET] /order/cart
orderController.cart = async (req, res) => {
	customer_id = req.user.customer_id
	let header_user = await index.header_user(req)
	let header = await index.header(req)
	let detailCart = await order.getDetailCart(customer_id)
	let formatFunction = await general.formatFunction()

	res.render("./pages/order/cart", {
		header: header,
		user: header_user,
		detailCart: detailCart,
		formatFunction: formatFunction,
	})
}

// [POST] /order/cart/delete
orderController.deleteCart = async (req, res) => {
	let customer_id = req.user.customer_id
	let productsCartDelete = req.body

	order.deleteCart(customer_id, productsCartDelete, function (err, success) {
		if (success) {
			return res.status(200).json({
				status: "success",
			})
		} else {
			return res.status(404).json({
				status: "error",
			})
		}
	})
}

// [POST] /order/cart/update
orderController.updateCart = async (req, res) => {
	let customer_id = req.user.customer_id
	let productsCartUpdate = req.body.productsCartUpdate
	let productsCartUpdateOld = req.body.productsCartUpdateOld

	await order.deleteCart(customer_id, productsCartUpdate, function (err, success) { })
	await order.deleteCart(customer_id, productsCartUpdateOld, function (err, success) { })

	await order.updateCart(customer_id, productsCartUpdate, function (err, success) {
		if (success) {
			return res.status(200).json({
				status: "success",
			})
		} else {
			return res.status(404).json({
				status: "error",
			})
		}
	})
}

// [GET] /order/information
orderController.information = async (req, res) => {
	let header_user = await index.header_user(req)
	let header = await index.header(req)
	let formatFunction = await general.formatFunction()

	res.render("./pages/order/information", {
		header: header,
		user: header_user,
		formatFunction: formatFunction,
	})
}

// [POST] /order/information
orderController.informationPost = async (req, res) => {
	let orderInformation = req.body

	let customer_id = req.user.customer_id
	let orderInfo = orderInformation.orderInfo
	let orderDetails = orderInformation.orderDetails

	order.insertOrder(
		customer_id,
		orderInfo,
		orderDetails,
		function (err, success, order_id, paying_method_id) {
			if (err) {
				return res.status(404).json({
					status: "error",
				})
			} else if (success) {
				order.deleteCart(customer_id, orderDetails, function (err, success) { })
				res.status(200).json({
					status: "success",
					order_id: order_id,
					paying_method_id: orderInfo.paying_method_id,
				})
			}
		}
	)
}

orderController.generateVnpayUrl = (req, purchase) => {
	const vnpUrl = process.env.VNPAY_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
	const vnpTmnCode = process.env.VNPAY_TMN_CODE || ""
	const vnpHashSecret = process.env.VNPAY_HASH_SECRET || ""
	const returnUrl = process.env.VNPAY_RETURN_URL || `http://${cfg.host}:${cfg.port}/order/vnpay-return`

	let ipAddr = req.headers["x-forwarded-for"] || req.connection.remoteAddress || req.socket.remoteAddress || req.ip
	if (ipAddr && ipAddr.includes(",")) {
		ipAddr = ipAddr.split(",")[0].trim()
	}

	const amount = purchase.order_details.reduce((sum, detail) => {
		return sum + Number(detail.order_detail_price_after) * Number(detail.order_detail_quantity)
	}, 0)

	const createDate = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "")

	const vnp_Params = {
		vnp_Version: "2.1.0",
		vnp_Command: "pay",
		vnp_TmnCode: vnpTmnCode,
		vnp_Amount: amount * 100,
		vnp_CurrCode: "VND",
		vnp_TxnRef: purchase.order_id.toString(),
		vnp_OrderInfo: `Thanh toán đơn hàng #DH00${purchase.order_id}`,
		vnp_OrderType: "billpayment",
		vnp_Locale: "vn",
		vnp_ReturnUrl: returnUrl,
		vnp_IpAddr: ipAddr,
		vnp_CreateDate: createDate,
	}

	const sortedKeys = Object.keys(vnp_Params).sort()
	const signData = sortedKeys.map(key => `${key}=${vnp_Params[key]}`).join("&")
	const secureHash = crypto.createHmac("sha512", vnpHashSecret).update(signData).digest("hex")
	vnp_Params.vnp_SecureHash = secureHash

	const query = sortedKeys.concat(["vnp_SecureHash"]).map(key => {
		return `${key}=${encodeURIComponent(vnp_Params[key])}`
	}).join("&")

	return `${vnpUrl}?${query}`
}

orderController.vnpayRedirect = async (req, res) => {
	const order_id = req.query.order_id
	const customer_id = req.user.customer_id

	const purchase = await account.getPurchaseHistory(customer_id, 0, order_id)
	if (!purchase || !purchase[0]) {
		return res.status(404).send("Không tìm thấy đơn hàng")
	}

	const url = orderController.generateVnpayUrl(req, purchase[0])
	return res.redirect(url)
}

orderController.vnpayReturn = async (req, res) => {
	const vnp_Params = { ...req.query }
	const secureHash = vnp_Params.vnp_SecureHash
	delete vnp_Params.vnp_SecureHash
	delete vnp_Params.vnp_SecureHashType

	const sortedKeys = Object.keys(vnp_Params).sort()
	const signData = sortedKeys.map(key => `${key}=${vnp_Params[key]}`).join("&")
	const vnpHashSecret = process.env.VNPAY_HASH_SECRET || ""
	const verifyHash = crypto.createHmac("sha512", vnpHashSecret).update(signData).digest("hex")

	const order_id = vnp_Params.vnp_TxnRef

	if (verifyHash !== secureHash) {
		return res.redirect(`/account/purchase?order_status=${encodeURIComponent("Chờ thanh toán")}`)
	}

	if (vnp_Params.vnp_ResponseCode === "00") {
		order.updatePaidOrder(order_id, function (err, success) {
			if (err) {
				return res.redirect(`/account/purchase?order_status=${encodeURIComponent("Chờ thanh toán")}`)
			}
			return res.redirect(`/account/purchase?order_status=${encodeURIComponent("Đang giao hàng")}`)
		})
	} else {
		return res.redirect(`/account/purchase?order_status=${encodeURIComponent("Chờ thanh toán")}`)
	}
}

// [GET] /order/payment?paying_method_id=x&order_id=y
orderController.payment = async (req, res) => {
	let paying_method_id = req.query.paying_method_id
	let order_id = req.query.order_id

	let customer_id = req.user.customer_id
	let header_user = await index.header_user(req)
	let header = await index.header(req)
	let formatFunction = await general.formatFunction()

	let purchase = await account.getPurchaseHistory(customer_id, 0, order_id)

	if (paying_method_id == 1) {
		return res.redirect(`/order/vnpay?order_id=${order_id}`)
	} else if (paying_method_id == 2) {
		res.render("./pages/order/atm", {
			header: header,
			user: header_user,
			formatFunction: formatFunction,
			purchase: purchase[0],
		})
	} else if (paying_method_id == 3) {
		res.render("./pages/order/credit", {
			header: header,
			user: header_user,
			formatFunction: formatFunction,
			purchase: purchase[0],
		})
	}
}

orderController.cancelOrder = async (req, res) => {
	let order_id = req.body.order_id;

	await order.updateCancelOrder(order_id, function (err, success) {
		if (err) {
			res.status(404).json({
				status: 'error',
			})
		} else {
			res.status(200).json({
				status: 'success',
			})
		}
	})
}

module.exports = orderController
