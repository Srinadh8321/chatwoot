
export default {
  namespaced: true,

  state: {
    items: [],     
    contact:{}       // list of objects
  },

  getters: {
    getItems: (state) => state.items,          // get full list
    getCount: (state) => state.items.length,  
    getContact: (state) => state.contact,    // get contact object
  },

  mutations: {
    SET_ITEMS(state, items) {
      state.items = items;
    },
    ADD_ITEM(state, item) {
      state.items.push(item);
    },
    REMOVE_ITEM(state, id) {
      state.items = state.items.filter(x => x.id !== id);
    },
    CLEAR_ITEMS(state) {
      state.items = [];
    },
    //contact mutations
    SET_CONTACT(state, contact) {
      state.contact = contact;
    }
  },

  actions: {
    setItems({ commit }, items) {
      commit("SET_ITEMS", items);
    },
    addItem({ commit }, item) {
      commit("ADD_ITEM", item);
    },
    removeItem({ commit }, id) {
      commit("REMOVE_ITEM", id);
    },
    clearItems({ commit }) {
      commit("CLEAR_ITEMS");
    }
    ,
    //contact actions
    setContact({ commit }, contact) {
      commit("SET_CONTACT", contact);
    }
  },
};
