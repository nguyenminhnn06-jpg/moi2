const db = require('../../config/db/connect');
const util = require('node:util')
const query = util.promisify(db.query).bind(db)
const general = require('../general.model');
const indexAdmin = require('./indexAdmin.model');
const product = require('../customer/product.model');

const cateAdmin = function () { }

cateAdmin.getCategories = async (searchKey, page, limit) => {
    let getRowSQL = "SELECT COUNT(*) as total FROM view_cate_admin"
    let getCateSQL = "SELECT * FROM view_cate_admin"
    if (searchKey) {
        getCateSQL += " WHERE view_cate_admin.category_name LIKE '%" + searchKey + "%'"
        getCateSQL += " OR view_cate_admin.category_id LIKE '%" + searchKey + "%'"
        getRowSQL += " WHERE view_cate_admin.category_name LIKE '%" + searchKey + "%'"
        getRowSQL += " OR view_cate_admin.category_id LIKE '%" + searchKey + "%'"
    }

    let rowData = await query(getRowSQL)
    let totalRow = rowData[0].total

    let totalPage = totalRow > 0 ? Math.ceil(totalRow / limit) : 1
    page = page > 0 ? Math.floor(page) : 1
    page = page <= totalPage ? Math.floor(page) : totalPage

    let start = (page - 1) * limit

    getCateSQL += " ORDER BY view_cate_admin.category_id LIMIT " + start + "," + limit;

    return new Promise((resolve, reject) => {
        db.query(getCateSQL, (err, cate) => {
            if (err) return reject(err);
            let categories = {
                categories: cate,
                searchKey: searchKey,
                totalRow: totalRow,
                totalPage: totalPage,
                page: parseInt(page),
                limit: limit,
            }
            resolve(categories)
        })
    })
}


cateAdmin.getProducts = async (searchKey, page, limit) => {
    let getRowSQL = "SELECT COUNT(*) as total FROM view_products_admin"
    let getProductSQL = "SELECT * FROM view_products_admin"
    if (searchKey) {
        getProductSQL += " WHERE view_products_admin.product_name LIKE '%" + searchKey + "%'"
        getProductSQL += " OR view_products_admin.product_id LIKE '%" + searchKey + "%'"
        getRowSQL += " WHERE view_products_admin.product_name LIKE '%" + searchKey + "%'"
        getRowSQL += " OR view_products_admin.product_id LIKE '%" + searchKey + "%'"
    }

    let rowData = await query(getRowSQL)
    let totalRow = rowData[0].total

    let totalPage = totalRow > 0 ? Math.ceil(totalRow / limit) : 1
    page = page > 0 ? Math.floor(page) : 1
    page = page <= totalPage ? Math.floor(page) : totalPage

    let start = (page - 1) * limit

    getProductSQL += " ORDER BY view_products_admin.revenue DESC LIMIT " + start + "," + limit;

    return new Promise((resolve, reject) => {
        db.query(getProductSQL, (err, product) => {
            if (err) return reject(err);
            let products = {
                products: product,
                searchKey: searchKey,
                totalRow: totalRow,
                totalPage: totalPage,
                page: parseInt(page),
                limit: limit,
            }
            resolve(products)
        })
    })
}

cateAdmin.getCategoryById = async (categoryId) => {
    let sql = "SELECT * FROM categories WHERE category_id = ?"
    return new Promise((resolve, reject) => {
        db.query(sql, [categoryId], (err, result) => {
            if (err) return reject(err);
            resolve(result[0])
        })
    })
}

cateAdmin.deleteCategory = async (categoryId) => {
    console.log('deleteCategory model called with id:', categoryId)
    return new Promise((resolve, reject) => {
        let hideProductVariantsQuery = "UPDATE product_variants SET product_variant_is_display = 0 WHERE product_id IN (SELECT product_id FROM products WHERE category_id = ?)"
        db.query(hideProductVariantsQuery, [categoryId], (err) => {
            if (err) {
                console.error('Error hiding product variants:', err)
                return reject(err)
            }
            
            let hideProductsQuery = "UPDATE products SET product_is_display = 0 WHERE category_id = ?"
            db.query(hideProductsQuery, [categoryId], (err) => {
                if (err) {
                    console.error('Error hiding products:', err)
                    return reject(err)
                }
                
                let hideCategoryQuery = "UPDATE categories SET category_is_display = 0 WHERE category_id = ?"
                db.query(hideCategoryQuery, [categoryId], (err, result) => {
                    if (err) {
                        console.error('Error hiding category:', err)
                        return reject(err)
                    }
                    console.log('Category hide result:', result)
                    resolve(result.affectedRows > 0)
                })
            })
        })
    })
}

cateAdmin.hideCategory = async (categoryId) => {
    let sql = "UPDATE categories SET category_is_display = !category_is_display WHERE category_id = ?"
    return new Promise((resolve, reject) => {
        db.query(sql, [categoryId], (err, result) => {
            if (err) return reject(err);
            resolve(result.affectedRows > 0)
        })
    })
}

cateAdmin.getProductById = async (productId) => {
    let sql = "SELECT * FROM products WHERE product_id = ?"
    return new Promise((resolve, reject) => {
        db.query(sql, [productId], (err, result) => {
            if (err) reject(err);
            resolve(result[0])
        })
    })
}

cateAdmin.deleteProduct = async (productId) => {
    return new Promise((resolve, reject) => {
        db.query('UPDATE product_variants SET product_variant_is_display = 0 WHERE product_id = ?', [productId], (err) => {
            if (err) return reject(err)

            db.query('UPDATE products SET product_is_display = 0 WHERE product_id = ?', [productId], (err, result) => {
                if (err) return reject(err)
                resolve(result.affectedRows > 0)
            })
        })
    })
}

cateAdmin.hideProduct = async (productId) => {
    let sql = "UPDATE products SET product_is_display = !product_is_display WHERE product_id = ?"
    return new Promise((resolve, reject) => {
        db.query(sql, [productId], (err, result) => {
            if (err) reject(err);
            resolve(result.affectedRows > 0)
        })
    })
}

cateAdmin.addCategory = async (categoryName, categoryDesc, categoryImg) => {
    let sql = "INSERT INTO categories (category_name, category_img) VALUES (?, ?)"
    return new Promise((resolve, reject) => {
        db.query(sql, [categoryName, categoryImg], (err, result) => {
            if (err) {
                console.error('SQL error in addCategory:', err && err.sqlMessage ? err.sqlMessage : err)
                console.error(err && err.stack ? err.stack : err)
                return reject(err)
            }
            resolve(result.affectedRows > 0)
        })
    })
}

cateAdmin.updateCategory = async (categoryId, categoryName, categoryImg) => {
    let sql = "UPDATE categories SET category_name = ?, category_img = ? WHERE category_id = ?"
    return new Promise((resolve, reject) => {
        db.query(sql, [categoryName, categoryImg, categoryId], (err, result) => {
            if (err) {
                console.error('SQL error in updateCategory:', err && err.sqlMessage ? err.sqlMessage : err)
                console.error(err && err.stack ? err.stack : err)
                return reject(err)
            }
            resolve(result.affectedRows > 0)
        })
    })
}

// ✅ Sửa: Thêm sản phẩm + tự động tạo product_variant
cateAdmin.addProduct = async (productName, productPrice, productDesc, categoryId, productAvtImg) => {
    return new Promise((resolve, reject) => {
        // Bước 1: Insert sản phẩm
        let insertProductSQL = "INSERT INTO products (product_name, category_id, product_avt_img, product_price, product_description, supplier_id) VALUES (?, ?, ?, ?, ?, 1)"
        
        db.query(insertProductSQL, [productName, categoryId, productAvtImg, productPrice, productDesc], (err, productResult) => {
            if (err) {
                console.error('SQL error in addProduct:', err && err.sqlMessage ? err.sqlMessage : err)
                return reject(err)
            }

            const productId = productResult.insertId
            console.log('✅ Product created with ID:', productId)

            // Bước 2: Tự động tạo product_variant
            let insertVariantSQL = "INSERT INTO product_variants (product_id, product_variant_name, product_variant_price, product_variant_available, product_variant_is_stock, product_variant_is_bestseller, product_variant_is_display) VALUES (?, ?, ?, ?, ?, ?, ?)"
            
            const variantName = productName // Dùng tên sản phẩm làm tên biến thể mặc định
            const variantPrice = productPrice
            const availableStock = 0 // Mặc định 0, admin có thể sửa sau
            
            db.query(insertVariantSQL, [productId, variantName, variantPrice, availableStock, 1, 0, 1], (err, variantResult) => {
                if (err) {
                    console.error('SQL error in creating product_variant:', err && err.sqlMessage ? err.sqlMessage : err)
                    // Xóa sản phẩm nếu tạo variant thất bại
                    db.query('DELETE FROM products WHERE product_id = ?', [productId], (deleteErr) => {
                        if (deleteErr) console.error('Error deleting product after variant failure:', deleteErr)
                        return reject(err)
                    })
                } else {
                    console.log('✅ Product variant created with ID:', variantResult.insertId)
                    resolve(true)
                }
            })
        })
    })
}

// ✅ Sửa: Cập nhật sản phẩm + cập nhật product_variant
cateAdmin.updateProduct = async (productId, productName, productPrice, productDesc, categoryId, productAvtImg) => {
    return new Promise((resolve, reject) => {
        // Bước 1: Cập nhật sản phẩm
        let updateProductSQL = "UPDATE products SET product_name = ?, product_avt_img = ?, product_price = ?, product_description = ?, category_id = ? WHERE product_id = ?"
        
        db.query(updateProductSQL, [productName, productAvtImg, productPrice, productDesc, categoryId, productId], (err, productResult) => {
            if (err) {
                console.error('SQL error in updateProduct:', err && err.sqlMessage ? err.sqlMessage : err)
                return reject(err)
            }

            console.log('✅ Product updated')

            // Bước 2: Cập nhật product_variant (lấy variant đầu tiên của sản phẩm)
            let getVariantSQL = "SELECT product_variant_id FROM product_variants WHERE product_id = ? LIMIT 1"
            
            db.query(getVariantSQL, [productId], (err, variantRows) => {
                if (err) {
                    console.error('Error fetching product variant:', err)
                    return resolve(true) // Không fail nếu không tìm được variant
                }

                if (variantRows && variantRows.length > 0) {
                    const variantId = variantRows[0].product_variant_id
                    
                    // Cập nhật tên và giá của variant
                    let updateVariantSQL = "UPDATE product_variants SET product_variant_name = ?, product_variant_price = ? WHERE product_variant_id = ?"
                    
                    db.query(updateVariantSQL, [productName, productPrice, variantId], (err, variantResult) => {
                        if (err) {
                            console.error('Error updating product_variant:', err)
                            return resolve(true) // Không fail nếu update variant thất bại
                        }

                        console.log('✅ Product variant updated')
                        resolve(true)
                    })
                } else {
                    console.log('⚠️ No product variant found, creating new one...')
                    
                    // Nếu không có variant, tạo mới
                    let insertVariantSQL = "INSERT INTO product_variants (product_id, product_variant_name, product_variant_price, product_variant_available, product_variant_is_stock, product_variant_is_bestseller, product_variant_is_display) VALUES (?, ?, ?, ?, ?, ?, ?)"
                    
                    db.query(insertVariantSQL, [productId, productName, productPrice, 0, 1, 0, 1], (err, variantResult) => {
                        if (err) {
                            console.error('Error creating new product_variant:', err)
                            return resolve(true) // Không fail
                        }

                        console.log('✅ New product variant created with ID:', variantResult.insertId)
                        resolve(true)
                    })
                }
            })
        })
    })
}

module.exports = cateAdmin