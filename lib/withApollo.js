import React from 'react'
import Head from 'next/head'
import { ApolloProvider } from '@apollo/react-hooks'
import { ApolloClient } from 'apollo-client'
import { InMemoryCache } from 'apollo-cache-inmemory'
import { HttpLink } from 'apollo-link-http'
import fetch from 'isomorphic-unfetch'
import { ApolloLink, Operation } from 'apollo-boost'

/**
 *  My withApollo.
 
 *  [1] ctx -> ctx: { req, res } setting. But Not used.
 *  [2] isServer -> SSR 'server' or 'client'
 *  [3] server work.
 *  [4] getToken -> get LocalStorage
 *  [5] authMiddleware -> operation setContext headers data(localStorage.getItem('')).
 */

let globalApolloClient = null;

/**
 * Creates and provides the apolloContext
 * to a next.js PageTree. Use it by wrapping
 * your PageComponent via HOC pattern.
 * @param {Function|Class} PageComponent
 * @param {Object} [config]
 * @param {Boolean} [config.ssr=true]
 */

/** 
 *  [2] isServer 
 * 
 *  클라이언트 측에서 동작하는 서버인지 확인하는 물어보는 함수.
 *  서버측: typeof window는 "undefined"를 출력함.
 */
const isServer = () => typeof window === "undefined";

/**
 *  [4] getToken
 */
const getToken = () => {
    // if(!isServer) {
        // console.log("LocalStoagre: ", localStorage.getItem('jwt') || "");
        return localStorage.getItem('jwt') || "";
    // }
};
/**
 *  [5] authMiddelware
 *  
 */
const authMiddleware = new ApolloLink((operation, forward) => {
    operation.setContext({
        headers: {
            "JWT": getToken()
        }
    });
    return forward(operation);
});
export function withApollo(PageComponent, { ssr = true } = {}) {
  const WithApollo = ({ apolloClient, apolloState, ...pageProps }) => {
    const client = apolloClient || initApolloClient(apolloState)
    return (
      <ApolloProvider client={client}>
        <PageComponent {...pageProps} />
      </ApolloProvider>
    )
  }

  // Set the correct displayName in development
  if (process.env.NODE_ENV !== 'production') {
    const displayName =
      PageComponent.displayName || PageComponent.name || 'Component'

    if (displayName === 'App') {
      console.warn('This withApollo HOC only works with PageComponents.')
    }

    WithApollo.displayName = `withApollo(${displayName})`
  }

  if (ssr || PageComponent.getInitialProps) {
    
    WithApollo.getInitialProps = async ctx => {
        /**
         *  [1] ctx
         *  ctx의 객체로 AppTree, ctx를 받는다.
         *  ctx로는 서버측에서 받는 작업이다.
         */
        const {  
            AppTree,
            ctx: { req, res }
        } = ctx

        /**
         *  [3] 서버측에서만 동작하는 코드 구현
         */
        if(isServer()) {
            // console.log("Server.");
            // console.log("req:", req);
            // console.log("headers:", req.headers);
            // console.log("cookie:", req.headers.cookie);
            // console.log("Hewllo ");
        }
      // Initialize ApolloClient, add it to the ctx object so
      // we can use it in `PageComponent.getInitialProp`.
      const apolloClient = (ctx.apolloClient = initApolloClient())

      // Run wrapped getInitialProps methods
      let pageProps = {}
      if (PageComponent.getInitialProps) {
        pageProps = await PageComponent.getInitialProps(ctx)
      }

      // Only on the server:
      if (isServer()) {
        // When redirecting, the response is finished.
        // No point in continuing to render
        if (ctx.res && ctx.res.finished) {
          return pageProps
        }

        // Only if ssr is enabled
        if (ssr) {
          try {
            // Run all GraphQL queries
            const { getDataFromTree } = await import('@apollo/react-ssr')
            await getDataFromTree(
              <AppTree
                pageProps={{
                  ...pageProps,
                  apolloClient,
                }}
              />
            )
          } catch (error) {
            // Prevent Apollo Client GraphQL errors from crashing SSR.
            // Handle them in components via the data.error prop:
            // https://www.apollographql.com/docs/react/api/react-apollo.html#graphql-query-data-error
            console.error('Error while running `getDataFromTree`', error)
          }

          // getDataFromTree does not call componentWillUnmount
          // head side effect therefore need to be cleared manually
          Head.rewind()
        }
      }

      // Extract query data from the Apollo store
      const apolloState = apolloClient.cache.extract()

      return {
        ...pageProps,
        apolloState,
      }
    }
  }

  return WithApollo
}

/**
 * Always creates a new apollo client on the server
 * Creates or reuses apollo client in the browser.
 * @param  {Object} initialState
 */
function initApolloClient(initialState) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (isServer()) {
    return createApolloClient(initialState)
  }

  // Reuse client on the client-side
  if (!globalApolloClient) {
    globalApolloClient = createApolloClient(initialState)
  }

  return globalApolloClient
}

/**
 * Creates and configures the ApolloClient
 * @param  {Object} [initialState={}]
 */
function createApolloClient(initialState = {}) {
  // Check out https://github.com/zeit/next.js/pull/4611 if you want to use the AWSAppSyncClient
  const httpLink = new HttpLink({
    uri: 'http://localhost:4000/graphql', // Server URL (must be absolute)
    credentials: 'same-origin', // Additional fetch() options like `credentials` or `headers`
    fetch,
  });

  return new ApolloClient({
    ssrMode: isServer(), // Disables forceFetch on the server (so queries are only run once)
    link: ApolloLink.from([ authMiddleware, httpLink ]),
    cache: new InMemoryCache().restore(initialState),
    resolvers: {
        Mutation: {

        },
        Query: {

        }
    }
  })
}