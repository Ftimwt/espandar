package config

type DatabaseType string

const (
	SqliteDatabaseType DatabaseType = "sqlite"
)

type Database struct {
	Type DatabaseType `env:"DB_TYPE"`
	Name string       `env:"DB_NAME"`
}
