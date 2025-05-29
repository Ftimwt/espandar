package config

type App struct {
	Title  string `env:"APP_TITLE"`
	Port   int    `env:"APP_PORT"`
	Secret string `env:"APP_SECRET"`
}
