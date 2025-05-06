/**
 * @description Home Context
 */
export const HomeContext = React.createContext({
    /**
     * @type {{name: string, id: number}}
     */
    selectedModel: undefined,
    /**
     * @type {"channel"|"group"|"user"}
     */
    type: String,

    /**
     * handle select model
     * @param {"channel"|"group"|"user"} type
     * @param {{name: string, id: number}} model
     */
    setSelected: (type, model) => {},
});

/**
 * @description use Home Context
 * @returns {{selectedModel: {name: string, id: number}, type: "channel"|"group"|"user", setSelected: (type, model) => {}}}
 */
export const useHome = () => useContext(HomeContext);

export const HomeProvider = ({ children }) => {
    const [selectedModel, setSelectedModel] = useState({});
    const [type, setType] = useState("");

    const setSelected = (type, model) => {
        setSelectedModel(model);
        setType(type);
    };

    const value = {
        selectedModel,
        type,
        setSelected,
    };

    return (
        <HomeContext.Provider value={value}>{children}</HomeContext.Provider>
    );
};
