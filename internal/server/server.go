package server

import (
	"flag"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/swagger"
	"github.com/gofiber/websocket/v2"
	"log"
	"os"
	"time"
	"v/internal/handlers"
	"v/internal/routes"
	"v/internal/stun"
	"v/pkg/config"
	"v/pkg/providers"

	w "v/pkg/webrtc"
    "v/pkg/presence"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/template/html"
	_ "v/docs"
)

var (
	addr = flag.String("addr", ":"+os.Getenv("PORT"), "")
	cert = flag.String("cert", "", "")
	key  = flag.String("key", "", "")
)

var presenceService = presence.New()

var hub *stun.Hub

func Run() error {
	stunServer := stun.NewSTUNServer(3478)
	if err := stunServer.Start(); err != nil {
		log.Fatal("Failed to start STUN server:", err)
	}
	hub = stun.NewHub()
	go hub.Run()

	flag.Parse()

	if *addr == ":" {
		*addr = ":8080"
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatal("error during load configs")
	}

	jwt := providers.LoadJwt(&cfg.App)

	db, err := providers.LoadDatabase(cfg)
	if err != nil {
		return err
	}

	notifier := providers.NewNotifier()

	engine := html.New("./views", ".html")
	app := fiber.New(fiber.Config{Views: engine, ErrorHandler: func(c *fiber.Ctx, err error) error {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}})
	app.Use(func(c *fiber.Ctx) error {
		defer func() {
			if err := recover(); err != nil {
				c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": err,
				})
			}
		}()
		return c.Next()
	})
	app.Use(logger.New())
	app.Use(cors.New())

	app.Use(func(c *fiber.Ctx) error {
		if re := recover(); re != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": re,
			})
		}
		return c.Next()
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:5173",
		AllowHeaders: "Origin, Content-Type, Accept",
	}))
	app.Static("/uploads", "./uploads")

	routes.SetupRoutes(app, db, jwt, notifier,
		map[string]func(routes fiber.Router, option routes.Option){
			"/auth":        routes.SetupAuth,
			"/channels":    routes.SetupChannel,
			"/groups":      routes.SetupGroup,
			"/users":       routes.SetupUser,
			"/chats":       routes.SetupChat,
			"/conferences": routes.SetupConference,
		},
	)

	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})
	app.Get("/ws/peer", websocket.New(stun.ServeWS))
    app.Get("/ws/:userID", websocket.New(func(c *websocket.Conn) {
    notifier.HandleWebSocketWithPresence(c, presenceService)
    }))

	app.Get("/ws/webrtc/:code", websocket.New(handlers.HandleWebRTC))
    
	// ✅ WebRTC Multi-Conference Room
	app.Get("/ws/conference/:roomId", websocket.New(w.HandleConferenceWebSocket))

	app.Get("/", handlers.Welcome)
	app.Get("/room/create", handlers.RoomCreate)
	app.Get("/room/:uuid", handlers.Room)
	app.Get("/room/:uuid/websocket", websocket.New(handlers.RoomWebsocket, websocket.Config{
		HandshakeTimeout: 10 * time.Second,
	}))
	app.Get("/room/:uuid/chat", handlers.RoomChat)
	app.Get("/room/:uuid/chat/websocket", websocket.New(handlers.RoomChatWebsocket))
	app.Get("/room/:uuid/viewer/websocket", websocket.New(handlers.RoomViewerWebsocket))
	app.Get("/stream/:suuid", handlers.Stream)
	app.Get("/stream/:suuid/websocket", websocket.New(handlers.StreamWebsocket, websocket.Config{
		HandshakeTimeout: 10 * time.Second,
	}))
	app.Get("/stream/:suuid/chat/websocket", websocket.New(handlers.StreamChatWebsocket))
	app.Get("/stream/:suuid/viewer/websocket", websocket.New(handlers.StreamViewerWebsocket))
	app.Static("/", "./assets")

	app.Get("/swagger/*", swagger.HandlerDefault)

	app.Get("/swagger/*", swagger.New(swagger.Config{
		URL:         "http://example.com/doc.json",
		DeepLinking: false,
		DocExpansion: "none",
		OAuth: &swagger.OAuthConfig{
			AppName:  "OAuth Provider",
			ClientId: "21bb4edc-05a7-4afc-86f1-2e151e4ba6e2",
		},
		OAuth2RedirectUrl: "http://localhost:8080/swagger/oauth2-redirect.html",
	}))

	w.Rooms = make(map[string]*w.Room)
	w.Streams = make(map[string]*w.Room)
	go dispatchKeyFrames()
	if *cert != "" {
		return app.ListenTLS(*addr, *cert, *key)
	}
	return app.Listen(*addr)
}

func dispatchKeyFrames() {
	for range time.NewTicker(time.Second * 3).C {
		for _, room := range w.Rooms {
			room.Peers.DispatchKeyFrame()
		}
	}
}
