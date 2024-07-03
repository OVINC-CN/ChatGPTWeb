import {createStore} from 'vuex';
import {getUserInfoAPI} from '@/api/user';
import {listModelsAPI} from '@/api/model';
import {getWalletConfigAPI} from '@/api/wallet';

const store = createStore({
  state() {
    return {
      mainLoading: false,
      isLogin: false,
      user: {
        username: '',
        nick_name: '',
        last_login: '',
        user_type: '',
      },
      userInfoVisible: false,
      chargeVisible: false,
      userProperties: {
        avatar: null,
        phone_number: null,
        mail_address: null,
      },
      userPropertiesRaw: [],
      models: [],
      currentModel: '',
      walletConfig: {
        is_enabled: false,
        unit: '',
      },
    };
  },
  mutations: {
    setUserInfoVisible(state, payload) {
      state.userInfoVisible = payload;
    },
    setChargeVisible(state, payload) {
      state.chargeVisible = payload;
    },
    setMainLoading(state, payload) {
      state.mainLoading = payload;
    },
    setUser(state, payload) {
      state.user = payload;
    },
    setIsLogin(state, payload) {
      state.isLogin = payload;
    },
    setUserProperty(state, payload) {
      payload.forEach((item) => (state.userProperties[item.property_key] = item.property_val));
    },
    setUserPropertyRaw(state, payload) {
      state.userPropertiesRaw = payload;
    },
    setModels(state, payload) {
      state.models = payload;
    },
    setCurrentModel(state, payload) {
      state.currentModel = payload;
    },
    setWalletConfig(state, payload) {
      state.walletConfig = payload;
    },
  },
  actions: {
    setMainLoading({commit}, payload) {
      if (payload) {
        commit('setMainLoading', true);
      } else {
        setTimeout(() => {
          commit('setMainLoading', false);
        }, 600);
      }
    },
    getUserInfo({commit}) {
      getUserInfoAPI().then((res) => {
        commit('setUser', res.data);
        commit('setIsLogin', true);
      });
    },
    getModels({commit}) {
      listModelsAPI().then((res) => {
        commit('setModels', res.data);
      });
    },
    getWalletConfig({commit}) {
      getWalletConfigAPI().then((res) => {
        commit('setWalletConfig', res.data);
      });
    },
  },
});

export default store;
