package repositories

import "gorm.io/gorm"

type Interface[T any] interface {
	Create(model *T) error
	Update(model *T) error
	Delete(id ...uint) error
	Get(id uint) (*T, error)
	List() ([]T, error)
}

type Repository[T any] struct {
	db *gorm.DB
}

func NewRepository[T any](db *gorm.DB) *Repository[T] {
	return &Repository[T]{
		db: db,
	}
}

func (r Repository[T]) Create(model *T) error {
	return r.db.Create(&model).Error
}

func (r Repository[T]) Update(model *T) error {
	return r.db.Save(&model).Error
}

func (r Repository[T]) Delete(id ...uint) error {
	var model T
	return r.db.Where("id in ?", id).Delete(model).Error
}

func (r Repository[T]) Get(id uint) (*T, error) {
	var model T
	return &model, r.db.First(&model, id).Error
}

func (r Repository[T]) List() ([]T, error) {
	var models []T
	return models, r.db.Find(&models).Error
}
