package config

import "github.com/caarlos0/env/v11"

type Config struct {
	App      App
	Database Database
}

func Load() (*Config, error) {
	app, err := env.ParseAs[Config]()
	return &app, err
}
