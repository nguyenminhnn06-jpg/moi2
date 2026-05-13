const general = require('../../models/general.model')
const cate = require('../../models/admin/cateAdmin.model')
const fs = require('fs')
const path = require('path')

const cateAdminController = () => { }

// [GET] /categories_admin/searchkey=?&page=?
cateAdminController.getCategories = async (req, res) => {
    const title = 'QUẢN LÝ DANH MỤC SẢN PHẨM'
    let admin = req.admin
    let searchKey = req.query.searchKey
    let page = req.query.page ? req.query.page : 1
    let limit = 10

    let categories = await cate.getCategories(searchKey, page, limit)
    let formatFunction = await general.formatFunction()

    res.status(200).render('admin/pages/cate_admin', {
        title: title,
        admin: admin,
        data: categories,
        formatFunction: formatFunction,
    })
}

// [GET] /products_admin
cateAdminController.getProducts = async (req, res) => {
    const title = 'QUẢN LÝ SẢN PHẨM'
    let admin = req.admin
    let searchKey = req.query.searchKey
    let page = req.query.page ? req.query.page : 1
    let limit = 10

    let products = await cate.getProducts(searchKey, page, limit)
    let formatFunction = await general.formatFunction()

    res.status(200).render('admin/pages/product_admin', {
        title: title,
        admin: admin,
        data: products,
        formatFunction: formatFunction,
    })
}

cateAdminController.addCategories = async (req, res) => {
    const title = 'QUẢN LÝ DANH MỤC SẢN PHẨM'
    let admin = req.admin

    let formatFunction = await general.formatFunction()

    res.status(200).render('admin/pages/cate_view_admin', {
        title: title,
        admin: admin,
        formatFunction: formatFunction,
    })
}

// [POST] /categories_admin/edit/:id
cateAdminController.postEditCategories = async (req, res) => {
    try {
        console.log('POST /categories_admin/edit received');
        console.log('Request body:', req.body);
        const categoryId = req.params.id
        const { categoryName, categoryDesc, imageData, imageName } = req.body

        if (!categoryName || categoryName.trim() === '') {
            return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' })
        }

        let savedFileName = null
        if (imageData && imageName) {
            try {
                const matches = imageData.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/)
                if (matches) {
                    const mime = matches[1]
                    const base64Data = matches[3]
                    const safeName = imageName.replace(/[^a-zA-Z0-9.\-\_]/g, '_')
                    const timestamp = Date.now()
                    savedFileName = `${timestamp}_${safeName}`

                    const imagesDir = path.join(__dirname, '..', '..', 'public', 'imgs', 'categories')
                    fs.mkdirSync(imagesDir, { recursive: true })
                    const filePath = path.join(imagesDir, savedFileName)
                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))

                    console.log('Saved category image to', filePath)
                }
            } catch (err) {
                console.error('Error saving image during category edit:', err)
            }
        }

        let finalImage = 'default.png'
        try {
            const existing = await cate.getCategoryById(categoryId)
            finalImage = savedFileName || (existing && existing.category_img) || 'default.png'
        } catch (e) {
            console.warn('Could not fetch existing category to preserve image:', e)
            finalImage = savedFileName || 'default.png'
        }

        const result = await cate.updateCategory(categoryId, categoryName, finalImage)
        console.log('Category update result:', result)
        if (result) {
            return res.status(200).json({ success: true, message: 'Cập nhật danh mục thành công', redirect: '/admin/categories_admin' })
        } else {
            return res.status(400).json({ success: false, message: 'Lỗi khi cập nhật danh mục' })
        }
    } catch (error) {
        console.error('Error updating category:', error)
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message, stack: error.stack })
    }
}

// [POST] /categories_admin/add
cateAdminController.postAddCategories = async (req, res) => {
    try {
        console.log('POST /categories_admin/add received');
        console.log('Request body:', req.body);
        
        const { categoryName, categoryDesc, imageData, imageName } = req.body
        
        if (!categoryName || categoryName.trim() === '') {
            console.log('Error: categoryName is empty');
            return res.status(400).json({ success: false, message: 'Tên danh mục không được để trống' })
        }

        let savedFileName = null
        if (imageData && imageName) {
            try {
                const matches = imageData.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/)
                if (matches) {
                    const mime = matches[1]
                    const base64Data = matches[3]
                    const safeName = imageName.replace(/[^a-zA-Z0-9.\-\_]/g, '_')
                    const timestamp = Date.now()
                    savedFileName = `${timestamp}_${safeName}`

                    const imagesDir = path.join(__dirname, '..', '..', 'public', 'imgs', 'categories')
                    console.log('Creating images dir:', imagesDir)
                    fs.mkdirSync(imagesDir, { recursive: true })
                    const filePath = path.join(imagesDir, savedFileName)
                    console.log('Saving image to:', filePath)
                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
                    console.log('Saved category image to', filePath)
                } else {
                    console.log('Image data format not recognized')
                }
            } catch (err) {
                console.error('Error saving image:', err)
            }
        }

        console.log('Adding category:', categoryName, categoryDesc, savedFileName);
        const result = await cate.addCategory(categoryName, categoryDesc || '', savedFileName)
        console.log('Add result:', result);
        
        if (result) {
            return res.status(200).json({ success: true, message: 'Thêm danh mục thành công', redirect: '/admin/categories_admin' })
        } else {
            return res.status(400).json({ success: false, message: 'Lỗi khi thêm danh mục' })
        }
    } catch (error) {
        console.error('Error adding category:', error)
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message, stack: error.stack })
    }
}

cateAdminController.addProducts = async (req, res) => {
    const title = 'QUẢN LÝ SẢN PHẨM'
    let admin = req.admin

    let categories = await general.getCates()
    let formatFunction = await general.formatFunction()

    res.status(200).render('admin/pages/product_view_admin', {
        title: title,
        admin: admin,
        categories: categories,
        formatFunction: formatFunction,
    })
}

// [POST] /products_admin/add
// [POST] /products_admin/add
cateAdminController.postAddProducts = async (req, res) => {
    try {
        console.log('POST /products_admin/add received');
        console.log('Request body:', req.body);
        
        const { productName, productPrice, productDesc, categoryId, imageData, imageName } = req.body

        console.log('Types:', {
            productNameType: typeof productName,
            productPriceType: typeof productPrice,
            productDescType: typeof productDesc,
            categoryIdType: typeof categoryId
        });     

        if (!productName || (typeof productName === 'string' && productName.trim() === '')) {
            console.log('Error: productName is empty');
            return res.status(400).json({ success: false, message: 'Tên sản phẩm không được để trống' })
        }

        let price = 0
        if (productPrice !== undefined && productPrice !== null && productPrice !== '') {
            price = Number(productPrice)
            if (Number.isNaN(price)) {
                console.log('Error: productPrice is not a number', productPrice)
                return res.status(400).json({ success: false, message: 'Giá sản phẩm không hợp lệ' })
            }
        }

        let catId = null
        if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
            catId = parseInt(categoryId)
            if (Number.isNaN(catId)) {
                console.log('Error: categoryId is not a number', categoryId)
                return res.status(400).json({ success: false, message: 'Danh mục không hợp lệ' })
            }
        } else {
            console.log('Warning: categoryId is empty or missing')
        }

        // Handle image upload
        let avtImg = 'default.png';

        if (imageData && imageName) {
            try {
                const matches = imageData.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/);
                if (matches) {
                    const base64Data = matches[3];
                    const safeName = imageName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
                    const timestamp = Date.now();
                    avtImg = `${timestamp}_${safeName}`;
                    
                    // ✅ Sửa: Lưu ảnh vào /public/imgs/product_image (không cần P{productId})
                    const imagesDir = path.join(__dirname, '..', '..', 'public', 'imgs', 'product_image');
                    fs.mkdirSync(imagesDir, { recursive: true });
                    const filePath = path.join(imagesDir, avtImg);
                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

                    console.log('Saved product image to', filePath);
                }
            } catch (err) {
                console.error('Error saving image:', err);
            }
        }

        console.log('Adding product:', { productName, price, productDesc, catId, avtImg });
        // ✅ Model sẽ tự động tạo product_variant
        const result = await cate.addProduct(productName, price, productDesc || '', catId, avtImg)
        console.log('Add result:', result);
        
        if (result) {
            return res.status(200).json({ success: true, message: 'Thêm sản phẩm thành công', redirect: '/admin/products_admin' })
        } else {
            return res.status(400).json({ success: false, message: 'Lỗi khi thêm sản phẩm' })
        }
    } catch (error) {
        console.error('Error adding product:', error)
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message, stack: error.stack })
    }
}
// [GET] /categories_admin/edit/:id
cateAdminController.editCategories = async (req, res) => {
    const title = 'CHỈNH SỬA DANH MỤC SẢN PHẨM'
    let admin = req.admin
    let categoryId = req.params.id

    let formatFunction = await general.formatFunction()
    let category = await cate.getCategoryById(categoryId)

    res.status(200).render('admin/pages/cate_view_admin', {
        title: title,
        admin: admin,
        category: category,
        formatFunction: formatFunction,
    })
}

// [POST] /categories_admin/delete/:id
cateAdminController.deleteCategory = async (req, res) => {
    console.log('deleteCategory called with id:', req.params.id)
    try {
        let categoryId = req.params.id
        
        let result = await cate.deleteCategory(categoryId)
        console.log('deleteCategory result:', result)
        
        if (result) {
            res.status(200).json({ success: true, message: 'Xóa danh mục và tất cả sản phẩm thành công' })
        } else {
            res.status(400).json({ success: false, message: 'Lỗi khi xóa danh mục' })
        }
    } catch (err) {
        console.error('Error hiding category:', err)
        
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + (err.sqlMessage || err.message) })
    }
}

// [POST] /categories_admin/hide/:id
cateAdminController.hideCategory = async (req, res) => {
    let categoryId = req.params.id
    let result = await cate.hideCategory(categoryId)
    
    if (result) {
        res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công' })
    } else {
        res.status(400).json({ success: false, message: 'Lỗi khi cập nhật trạng thái' })
    }
}

// [GET] /products_admin/edit/:id
cateAdminController.editProducts = async (req, res) => {
    const title = 'CHỈNH SỬA SẢN PHẨM'
    let admin = req.admin
    let productId = req.params.id

    let categories = await general.getCates()
    console.log("CATEGORIES:", categories);
    let formatFunction = await general.formatFunction()
    let product = await cate.getProductById(productId)

    res.status(200).render('admin/pages/product_view_admin', {
        title: title,
        admin: admin,
        product: product,
        categories: categories,
        formatFunction: formatFunction,
    })
}

// [POST] /products_admin/edit/:id
cateAdminController.postEditProducts = async (req, res) => {
    try {
        console.log('POST /products_admin/edit received');
        console.log('Request body:', req.body);
        const productId = req.params.id
        const { productName, productPrice, productDesc, categoryId, imageData, imageName } = req.body

        if (!productName || (typeof productName === 'string' && productName.trim() === '')) {
            return res.status(400).json({ success: false, message: 'Tên sản phẩm không được để trống' })
        }

        let price = 0
        if (productPrice !== undefined && productPrice !== null && productPrice !== '') {
            price = Number(productPrice)
            if (Number.isNaN(price)) {
                return res.status(400).json({ success: false, message: 'Giá sản phẩm không hợp lệ' })
            }
        }

        let catId = null
        if (categoryId !== undefined && categoryId !== null && categoryId !== '') {
            catId = parseInt(categoryId)
            if (Number.isNaN(catId)) {
                return res.status(400).json({ success: false, message: 'Danh mục không hợp lệ' })
            }
        }

        let avtImg = 'default.png'
        try {
            const existingProduct = await cate.getProductById(productId)
            avtImg = existingProduct && existingProduct.product_avt_img ? existingProduct.product_avt_img : 'default.png'
        } catch (e) {
            console.warn('Could not fetch existing product to preserve image:', e)
            avtImg = 'default.png'
        }

        if (imageData && imageName) {
            try {
                const matches = imageData.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/)
                if (matches) {
                    const base64Data = matches[3]
                    const safeName = imageName.replace(/[^a-zA-Z0-9.\-\_]/g, '_')
                    const timestamp = Date.now()
                    avtImg = `${timestamp}_${safeName}`

                    const imagesDir = path.join(__dirname, '..', '..', 'public', 'imgs', 'product_image')
                    console.log('Creating images dir:', imagesDir)
                    fs.mkdirSync(imagesDir, { recursive: true })
                    const filePath = path.join(imagesDir, avtImg)
                    console.log('Saving image to:', filePath)
                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
                    console.log('Saved product image to', filePath)
                } else {
                    console.log('Image data format not recognized')
                }
            } catch (err) {
                console.error('Error saving image during product edit:', err)
            }
        }

        console.log('Updating product:', { productId, productName, price, productDesc, catId, avtImg })
        const result = await cate.updateProduct(productId, productName, price, productDesc || '', catId, avtImg)
        console.log('Update result:', result)

        if (result) {
            return res.status(200).json({ success: true, message: 'Cập nhật sản phẩm thành công', redirect: '/admin/products_admin' })
        } else {
            return res.status(400).json({ success: false, message: 'Lỗi khi cập nhật sản phẩm' })
        }
    } catch (error) {
        console.error('Error updating product:', error)
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + error.message, stack: error.stack })
    }
}

// [POST] /products_admin/delete/:id
cateAdminController.deleteProduct = async (req, res) => {
    let productId = req.params.id
    try {
        let result = await cate.deleteProduct(productId)

        if (result) {
            return res.status(200).json({ success: true, message: 'Xóa sản phẩm thành công' })
        } else {
            return res.status(400).json({ success: false, message: 'Không thể xóa sản phẩm này' })
        }
    } catch (err) {
        console.error('Error hiding product:', err)
        
        return res.status(500).json({ success: false, message: 'Lỗi server: ' + (err.sqlMessage || err.message) })
    }
}

// [POST] /products_admin/hide/:id
cateAdminController.hideProduct = async (req, res) => {
    let productId = req.params.id
    let result = await cate.hideProduct(productId)
    
    if (result) {
        res.status(200).json({ success: true, message: 'Cập nhật trạng thái thành công' })
    } else {
        res.status(400).json({ success: false, message: 'Lỗi khi cập nhật trạng thái' })
    }
}

module.exports = cateAdminController