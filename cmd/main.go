package main

import (
	"log"

	_ "v/docs"
	"v/internal/server"
)

func main() {
	if err := server.Run(); err != nil {
		log.Fatalln(err.Error())
	}
}
